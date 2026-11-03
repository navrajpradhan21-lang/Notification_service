import Redis from "ioredis"

const redis = new Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    maxRetriesPerRequest: null,
});

/*Why maxRetriesPerRequest: null?

BullMQ workers require this setting for their Redis connection so commands can remain pending through Redis reconnections rather than failing after a limited number of retries.*/

redis.on("connect",()=>{
    console.log("Redis Connected Successfully");
});

redis.on("error",(error)=>{
    console.log("Redis Error:",error.message);
});

export default redis;
