/**
 * Frontend API Integration Test
 * Tests the HTTP API endpoints for the chatbot
 */

const http = require('http');

const API_URL = "http://localhost:5000/api";

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[Network Error] ${method} ${path}: ${err.message}`);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      console.error(`[Timeout] ${method} ${path}`);
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error';
    console.error(`❌ ${name}: ${msg}`);
    return false;
  }
}

async function runTests() {
  console.log("\n📋 Frontend API Integration Tests\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Create Session
  if (
    await test("Create session", async () => {
      const result = await makeRequest("POST", "/session");
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (!result.data.sessionId) throw new Error("No sessionId in response");
      global.sessionId = result.data.sessionId;
      console.log(`   Session ID: ${result.data.sessionId.substring(0, 8)}...`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Send greeting
  if (
    await test("Send greeting message", async () => {
      const result = await makeRequest("POST", "/chat", {
        message: "Hi there",
        sessionId: global.sessionId
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (!result.data.response) throw new Error("No response in reply");
      console.log(`   Response: "${result.data.response.substring(0, 60)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Request menu items
  if (
    await test("Request menu items under $20", async () => {
      const result = await makeRequest("POST", "/chat", {
        message: "Show menu items under $20",
        sessionId: global.sessionId
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (!result.data.response) throw new Error("No response in reply");
      console.log(`   Response: "${result.data.response.substring(0, 60)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: Request restaurants
  if (
    await test("Request restaurants", async () => {
      const result = await makeRequest("POST", "/chat", {
        message: "Find romantic restaurants",
        sessionId: global.sessionId
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (!result.data.response) throw new Error("No response in reply");
      console.log(`   Response: "${result.data.response.substring(0, 60)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: Budget query
  if (
    await test("Request with budget", async () => {
      const result = await makeRequest("POST", "/chat", {
        message: "I have $10, recommend something",
        sessionId: global.sessionId
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      if (!result.data.response) throw new Error("No response in reply");
      console.log(`   Response: "${result.data.response.substring(0, 60)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Response format validation
  if (
    await test("Validate response format", async () => {
      const result = await makeRequest("POST", "/chat", {
        message: "Thanks!",
        sessionId: global.sessionId
      });
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      const keys = Object.keys(result.data);
      if (keys.length > 2 || !keys.includes("response") || !keys.includes("sessionId")) {
        throw new Error(`Unexpected response format: ${JSON.stringify(keys)}`);
      }
      console.log(`   Fields: ${keys.join(", ")}`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
