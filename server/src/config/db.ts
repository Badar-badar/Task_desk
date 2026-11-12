import mongoose from "mongoose"
import { ApiError } from "../utils/ApiError";


export const connectDB = async():Promise<void>=>{

    const uri = process.env.MONGO_URI;
    if(!uri){
        throw new Error("MONGO_URI is not defined in .env")
    }
   mongoose.connection.on('connected',()=>console.log("Mongodb connected"));
   mongoose.connection.on('error',(err)=> console.error("Mongodb error: ",err));
   mongoose.connection.on('disconnected', ()=>console.warn("Mongodb disconnected"));

   await mongoose.connect(uri);
}

export const disconnectDB  = async():Promise<void> =>{
    await mongoose.disconnect();
}