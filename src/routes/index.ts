import express, { Request, Response } from "express";
import singleFilePondRoutes from "./singleFilePond";

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript with Express! File Manager Api is running.");
});

app.use("/single-file-pond", singleFilePondRoutes);

export default app;
