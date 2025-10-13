/**
 * Redis Configuration for BorrowEase
 * Used for OTP caching, session management, and performance optimization
 */

import redis from 'redis';

let redisClient = null;

/**
 * Initialize Redis connection
 */
const connectRedis = async () => {
    try {
        // Create Redis client
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis: Maximum reconnection attempts exceeded');
                        return new Error('Maximum reconnection attempts exceeded');
                    }
                    // Exponential backoff: 50ms * 2^retries
                    return Math.min(retries * 50, 3000);
                }
            }
        });

        // Error handler
        redisClient.on('error', (err) => {
            console.error('❌ Redis Error:', err.message);
        });

        // Connection event
        redisClient.on('connect', () => {
            console.log('🔄 Redis: Connecting...');
        });

        // Ready event
        redisClient.on('ready', () => {
            console.log('✅ Redis: Connected and ready');
        });

        // Reconnecting event
        redisClient.on('reconnecting', () => {
            console.log('🔄 Redis: Reconnecting...');
        });

        // End event
        redisClient.on('end', () => {
            console.log('⚠️ Redis: Connection closed');
        });

        // Connect to Redis
        await redisClient.connect();

        // Test connection
        const pong = await redisClient.ping();
        if (pong === 'PONG') {
            console.log('✅ Redis: Connection test successful');
        }

        return redisClient;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.log('⚠️ Running without Redis. OTP features will be limited.');
        return null;
    }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
    return redisClient;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
    try {
        if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
            console.log('✅ Redis: Connection closed gracefully');
        }
    } catch (error) {
        console.error('❌ Error closing Redis connection:', error.message);
    }
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
    return redisClient && redisClient.isOpen;
};

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
    await closeRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeRedis();
    process.exit(0);
});

export {
    connectRedis,
    getRedisClient,
    closeRedis,
    isRedisConnected
};
