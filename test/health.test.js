import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("Health Check responde correctamente", async () => {
    const response = await request(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
});

test("Una ruta inexistente devuelve 404", async () => {
    const response = await request(app).get("/ruta-que-no-existe");

    assert.equal(response.status, 404);
});