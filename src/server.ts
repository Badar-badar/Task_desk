import app from './app';
import {connectDB, disconnectDB} from './config/db'
const start = async() =>{
    try {
        await connectDB();

        const port = Number(process.env.PORT) || 3000;
        const server = app.listen(port, ()=>{
        console.log(`server is running on port ${port}`);

        const shutdown = async(signal: string):Promise<void> =>{
            console.log(`${signal} received. shutting down ...`);
            server.close(async() =>{
                await disconnectDB();
                process.exit(0);
            })
        };

        process.on('SIGINT',()=>shutdown('SIGINT'));
        process.on('SIGTERM',()=>shutdown('SIGTERM'));
    })
    } catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
    
}

start();
