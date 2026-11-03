import express from "express"
import cors from "cors";

const app  = express()

app.use(cors());
app.use(express.json());

app.get("/health",(req,res)=>{
    res.status(200).json({
        success:true,
        message:"Notification Service is running",
    });

});

export default app;
