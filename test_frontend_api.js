/**
 * Frontend API Integration Test
 * Tests HTTP endpoints with proper error handling
 */

const http = require("http");

const API_URL = "http://localhost:5000/api";

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Network error: ${e.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log("\n🧪 Frontend API Integration Tests\n");
  let passed = 0;
  let failed = 0;

  // Test 1: Create Session
  if (
    await test("Create session", async () => {
      const res = await makeRequest("POST", "/session");
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.sessionId) throw new Error("No sessionId in response");
      global.sessionId = res.data.sessionId;
      console.log(`   ✓ Session ID: ${res.data.sessionId.substring(0, 8)}...`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Send greeting
  if (
    await test("Send greeting message", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "Hi there",
        sessionId: global.sessionId
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.response) throw new Error("No response in reply");
      if (!res.data.sessionId) throw new Error("No sessionId in response");
      console.log(`   ✓ Response: "${res.data.response.substring(0, 50)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Menu items query
  if (
    await test("Query menu items under $20", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "Show menu items under $20",
        sessionId: global.sessionId
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.response) throw new Error("No response in reply");
      console.log(`   ✓ Found items: ${res.data.response.includes("$") ? "yes" : "no"}`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: Romantic restaurants
  if (
    await test("Query romantic restaurants", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "Find romantic restaurants",
        sessionId: global.sessionId
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.response) throw new Error("No response in reply");
      console.log(`   ✓ Response: "${res.data.response.substring(0, 50)}..."`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: Budget query
  if (
    await test("Query with budget constraint", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "I have $10, recommend something",
        sessionId: global.sessionId
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (!res.data.response) throw new Error("No response in reply");
      console.log(`   ✓ Found recommendations`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Response format validation
  if (
    await test("Validate response format (response + sessionId only)", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "Thanks!",
        sessionId: global.sessionId
      });
      const keys = Object.keys(res.data);
      if (!keys.includes("response") || !keys.includes("sessionId")) {
        throw new Error(
          `Expected response and sessionId, got: ${keys.join(", ")}`
        );
      }
      if (keys.length > 2) {
        throw new Error(`Unexpected extra fields: ${keys.join(", ")}`);
      }
      console.log(`   ✓ Format valid: ${keys.join(", ")}`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 7: Multiple messages in same session
  if (
    await test("Handle multiple messages in same session", async () => {
      const res1 = await makeRequest("POST", "/chat", {
        message: "What do you recommend?",
        sessionId: global.sessionId
      });
      const res2 = await makeRequest("POST", "/chat", {
        message: "Show me more options",
        sessionId: global.sessionId
      });
      if (res1.status !== 200 || res2.status !== 200) {
        throw new Error("One or more requests failed");
      }
      if (!res1.data.response || !res2.data.response) {
        throw new Error("Missing response in one of the messages");
      }
      console.log(`   ✓ Both messages processed`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 8: Session persistence
  if (
    await test("Session ID persists across requests", async () => {
      const res = await makeRequest("POST", "/chat", {
        message: "Hello again",
        sessionId: global.sessionId
      });
      if (res.data.sessionId !== global.sessionId) {
        throw new Error("Session ID changed across requests");
      }
      console.log(`   ✓ Session persisted correctly`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log(`\n📊 Test Results`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

console.log("🚀 Starting Frontend API Integration Tests");
console.log(`   Backend URL: ${API_URL}`);
console.log(`   Timestamp: ${new Date().toLocaleString()}\n`);

// Wait a bit for connections to establish
setTimeout(runTests, 500);
