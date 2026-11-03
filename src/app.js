import express from "express"
import cors from "cors";
import router from "./routes/notification.routes.js";
import userRouter from "./routes/user.routes.js";



const app  = express()

app.use(cors());
app.use(express.json());

app.get("/health",(req,res)=>{
    res.status(200).json({
        success:true,
        message:"Notification Service is running",
    });
});

app.use("/api/v1/notifications",router);
app.use("/api/v1/users", userRouter);

export default app;
