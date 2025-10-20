const { Redis } = require('@upstash/redis');
require('dotenv').config();

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error('❌ Redis credentials not found in environment variables');
    console.log('Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env file');
    process.exit(1);
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Test connection
    console.log('📡 Pinging Redis...');
    const pong = await redis.ping();
    console.log('✅ Redis ping response:', pong);

    // Test basic operations
    console.log('🧪 Testing basic operations...');
    
    // Set a test key
    await redis.set('test:connection', 'Hello Redis!', { ex: 60 });
    console.log('✅ Set test key');

    // Get the test key
    const value = await redis.get('test:connection');
    console.log('✅ Retrieved test key:', value);

    // Test JSON serialization
    const testData = { message: 'Hello from PolicyPal!', timestamp: new Date().toISOString() };
    await redis.set('test:json', JSON.stringify(testData), { ex: 60 });
    console.log('✅ Set JSON data');

    const jsonValue = await redis.get('test:json');
    console.log('🔍 Raw JSON value:', jsonValue, 'Type:', typeof jsonValue);
    
    // Handle different return types from Upstash Redis
    let parsedData;
    if (typeof jsonValue === 'string') {
      parsedData = JSON.parse(jsonValue);
    } else if (typeof jsonValue === 'object' && jsonValue !== null) {
      parsedData = jsonValue; // Already parsed
    } else {
      throw new Error(`Unexpected data type: ${typeof jsonValue}`);
    }
    console.log('✅ Retrieved JSON data:', parsedData);

    // Test key expiration
    console.log('⏰ Testing TTL...');
    const ttl = await redis.ttl('test:connection');
    console.log('✅ TTL for test key:', ttl, 'seconds');

    // Clean up test keys
    await redis.del('test:connection', 'test:json');
    console.log('✅ Cleaned up test keys');

    console.log('🎉 Redis connection test completed successfully!');
    console.log('Your Redis setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('Please check your Redis credentials and network connection.');
    process.exit(1);
  }
}

testRedisConnection();
