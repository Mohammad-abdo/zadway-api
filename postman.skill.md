---
name: postman-skill
description: >
  Postman collection generation skill. Use this skill whenever the user asks to create,
  update, or organize a Postman collection — including generating requests, environments,
  variables, auth headers, tests, or full CRUD collections for any API resource.
  Also triggers for "generate postman collection", "add API to postman",
  "create requests for [feature]", or "document this API".
---

# Postman Skill — API Collection Agent

You are a backend-aware API documentation engineer.
When generating any Postman collection or request, follow every rule in this file exactly.

---

## 📐 API Response Shape (Backend Standard)

All APIs follow this exact response structure:

```json
// Success Response
{
  "success": true,
  "message": "Operation successful",
  "results": 10,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "data": { }
}

// Error Response
{
  "success": false,
  "message": "Error description here",
  "data": {}
}
```

---

## 🌍 Environments

Always generate **two environments** for every project:

### Development
```
base_url      = http://localhost:3000/api
token         = (empty — filled after login)
```

### Production
```
base_url      = https://api.yourproject.com/api
token         = (empty — filled after login)
```

All requests use `{{base_url}}` and `{{token}}` — never hardcode URLs or tokens.

---

## 🔐 Authentication

Every request (except login/register) must include:

```
Header: Authorization
Value:  Bearer {{token}}
```

### Auto-Token Script (on Login request)

Add this to the **Tests** tab of the Login request to auto-save the token:

```javascript
const res = pm.response.json();
if (res.success && res.data?.token) {
  pm.environment.set("token", res.data.token);
  console.log("✅ Token saved:", res.data.token);
}
```

---

## 📁 Collection Structure

Every collection is organized as folders per resource:

```
📁 [Project Name]
├── 📁 Auth
│   ├── Login
│   └── Register
├── 📁 Users
│   ├── Get All Users
│   ├── Get User by ID
│   ├── Create User
│   ├── Update User
│   └── Delete User
├── 📁 [Next Resource]
│   └── ...
```

---

## 📝 Request Templates

### GET All (with Pagination + Search)

```
Method:  GET
URL:     {{base_url}}/users
Params:
  page    = 1
  limit   = 10
  search  = (empty, optional)
Headers:
  Authorization: Bearer {{token}}
```

**Tests:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Success is true", () => {
  const res = pm.response.json();
  pm.expect(res.success).to.be.true;
});
pm.test("Has pagination meta", () => {
  const res = pm.response.json();
  pm.expect(res.meta).to.have.property('total');
  pm.expect(res.meta).to.have.property('totalPages');
});
```

---

### GET by ID

```
Method:  GET
URL:     {{base_url}}/users/{{user_id}}
Headers:
  Authorization: Bearer {{token}}
```

**Tests:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Returns correct resource", () => {
  const res = pm.response.json();
  pm.expect(res.success).to.be.true;
  pm.expect(res.data).to.have.property('id');
});
```

---

### POST (Create)

```
Method:  POST
URL:     {{base_url}}/users
Headers:
  Authorization: Bearer {{token}}
  Content-Type:  application/json
Body (raw JSON):
{
  "name": "Test User",
  "email": "test@example.com",
  "role": "user"
}
```

**Tests:**
```javascript
pm.test("Status is 201", () => pm.response.to.have.status(201));
pm.test("Created successfully", () => {
  const res = pm.response.json();
  pm.expect(res.success).to.be.true;
  // Auto-save created resource ID for use in other requests
  if (res.data?.id) pm.environment.set("user_id", res.data.id);
});
```

---

### PATCH (Update)

```
Method:  PATCH
URL:     {{base_url}}/users/{{user_id}}
Headers:
  Authorization: Bearer {{token}}
  Content-Type:  application/json
Body (raw JSON):
{
  "name": "Updated Name"
}
```

**Tests:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Updated successfully", () => {
  const res = pm.response.json();
  pm.expect(res.success).to.be.true;
  pm.expect(res.message).to.be.a('string');
});
```

---

### DELETE

```
Method:  DELETE
URL:     {{base_url}}/users/{{user_id}}
Headers:
  Authorization: Bearer {{token}}
```

**Tests:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Deleted successfully", () => {
  const res = pm.response.json();
  pm.expect(res.success).to.be.true;
});
```

---

## 📤 Mobile Team Collection Export Rules

When generating collections for the mobile team:

1. **Always export as Collection v2.1** (compatible with all Postman versions)
2. Include **both environments** (dev + prod) as separate JSON files
3. Add a `README` request at the top of the collection with description:
   - Base URL pattern
   - How to set the token
   - List of available resources
4. Group requests logically — mobile team uses folders to find endpoints fast
5. Add example responses to every request (use real response shapes from the backend standard above)

---

## 🔄 Collection Variables (Global)

Always set these variables at the Collection level:

| Variable | Value | Description |
|---|---|---|
| `base_url` | `{{base_url}}` | From environment |
| `token` | `{{token}}` | Set by login script |
| `user_id` | `` | Set by create/list requests |
| `page` | `1` | Default pagination |
| `limit` | `10` | Default page size |

---

## ✅ General Rules

- Never hardcode tokens, passwords, or secrets in requests — always use variables
- Every request must have at least 2 test assertions
- Login request always has the auto-token script
- Create requests always save the new resource ID to environment variable
- Use `{{resource_id}}` naming convention for all ID variables (e.g. `{{user_id}}`, `{{order_id}}`)
- Always match request body shape to the backend's DTO exactly
- Error test cases (400, 401, 404) should be duplicate requests in a subfolder named `Edge Cases`
