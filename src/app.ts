import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import mongoose, { ConnectOptions, Model } from 'mongoose';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Load environment variables
dotenv.config();

// Simple interface for test model
interface ITest extends mongoose.Document {
  message: string;
  createdAt: Date;
}

class App {
  public app: Application;
  private readonly MONGO_URI: string;
  private isDBConnected: boolean;
  private TestModel: Model<ITest>;

  constructor() {
    this.app = express();
    this.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
    this.isDBConnected = false;

    // Initialize Test model schema
    const testSchema = new mongoose.Schema({
      message: { type: String, default: 'Hello MongoDB!' },
      createdAt: { type: Date, default: Date.now }
    });
    this.TestModel = mongoose.model<ITest>('Test', testSchema);

    this.initializeMiddlewares();
    this.initializeDatabase();
    this.initializeViewEngine();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(cors());

    // Add request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeViewEngine(): void {
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.use(express.static(path.join(__dirname, 'public')));
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