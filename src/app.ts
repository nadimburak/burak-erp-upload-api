import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import mongoose, { ConnectOptions, Model } from 'mongoose';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import fs from 'fs-extra';
import multer, { diskStorage } from 'multer';
import { TEMP_DIR, UPLOAD_DIR } from './utils/file.util';


// Load environment variables
dotenv.config();

// Simple interface for test model
interface ITest extends mongoose.Document {
  message: string;
  createdAt: Date;
}


interface ChunkUploadRequest extends Request {
  body: {
    uploadId: string;
    chunkIndex: string;
    totalChunks: string;
    filename: string;
  };
}

class App {
  public app: Application;
  private readonly MONGO_URI: string;
  private isDBConnected: boolean;
  private TestModel: Model<ITest>;
  private upload: multer.Multer;


  constructor() {
    this.app = express();
    this.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
    this.isDBConnected = false;

    // Initialize Multer
    this.upload = this.configureMulter();

    // Initialize Test model schema
    const testSchema = new mongoose.Schema({
      message: { type: String, default: 'Hello MongoDB!' },
      createdAt: { type: Date, default: Date.now }
    });
    this.TestModel = mongoose.model<ITest>('Test', testSchema);

    this.ensureDirectoriesExist();
    this.initializeMiddlewares();
    this.initializeDatabase();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private configureMulter(): multer.Multer {
    // Add validation for required fields
    const validateChunkUpload = (req: ChunkUploadRequest) => {
      const { uploadId, chunkIndex } = req.body;
      if (!uploadId || !chunkIndex) {
        throw new Error('Missing required fields: uploadId and chunkIndex');
      }
    };

    // Configure storage
    const storage = diskStorage({
      destination: async (req: ChunkUploadRequest, file, cb) => {
        try {
          validateChunkUpload(req);
          const { uploadId } = req.body;
          const chunkDir = path.join(TEMP_DIR, uploadId);
          await fs.ensureDir(chunkDir);
          cb(null, chunkDir);
        } catch (err: any) {
          cb(err, '');
        }
      },
      filename: (req: ChunkUploadRequest, file, cb) => {
        const { chunkIndex } = req.body;
        cb(null, `${chunkIndex}.part`);
      }
    });

    // File filter to allow only certain file types
    const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      // Also check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];

      if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type or extension'));
      }
    };

    // Configure Multer instance
    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  }

  private initializeMiddlewares(): void {
    this.app.use(bodyParser.text());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(cors());

    this.app.use('/uploads', express.static(UPLOAD_DIR));

    // Add request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.ensureDir(UPLOAD_DIR);
      await fs.ensureDir(TEMP_DIR);
      console.log(`Upload directory: ${UPLOAD_DIR}`);
      console.log(`Temp directory: ${TEMP_DIR}`);
    } catch (error) {
      console.error('Failed to create directories:', error);
      process.exit(1);
    }
  }


  private initializeRoutes(): void {
    // MongoDB test endpoint
    this.app.get('/mongo-test', (req: Request, res: Response, next: NextFunction): void => {
      if (!this.isDBConnected) {
        res.status(503).json({ error: 'Database not connected' });
        return;
      }

      // Use an async IIFE to handle async/await with error forwarding
      (async () => {
        try {
          // Create a test document
          const testDoc = new this.TestModel();
          await testDoc.save();

          // Retrieve all test documents
          const docs = await this.TestModel.find().sort({ createdAt: -1 }).limit(10);

          res.json({
            status: 'success',
            message: 'MongoDB connection test successful',
            latestDocument: testDoc,
            recentDocuments: docs
          });
        } catch (error) {
          console.error('MongoDB test error:', error);
          res.status(500).json({ error: 'MongoDB operation failed' });
        }
      })().catch(next);
    });

    // Main routes
    this.app.use('/', routes);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private initializeDatabase(): void {
    if (!this.MONGO_URI) {
      console.error('MongoDB connection URI not found in environment variables');
      process.exit(1);
    }

    const mongooseOptions: ConnectOptions = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000 // 30 seconds
    };

    mongoose
      .connect(this.MONGO_URI, mongooseOptions)
      .then(() => {
        console.log('Successfully connected to MongoDB');
        this.isDBConnected = true;
      })
      .catch((error: Error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
      });

    mongoose.connection.on('error', (error: Error) => {
      console.error('MongoDB runtime error:', error);
      this.isDBConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      this.isDBConnected = false;
    });
  }

  public start(port: number): void {
    this.app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }

  // Add a method to check database status
  public getDBStatus(): boolean {
    return this.isDBConnected;
  }
}

export default App;