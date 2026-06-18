import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import redis from "../src/config/redis.js";
import mongoose from "mongoose";
import db from "../src/config/db.js";

test("Health Check responde correctamente", async () => {
    const response = await request(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
});

test("Una ruta inexistente devuelve 404", async () => {
    const response = await request(app).get("/ruta-que-no-existe");

    assert.equal(response.status, 404);
});

// Cerrar conexiones abiertas al finalizar los tests para evitar que el proceso se quede colgado
test.after(async () => {
    try {
        await redis.quit();
    } catch (err) {
        console.error("Error al cerrar Redis en test:", err.message);
    }
    try {
        await mongoose.connection.close();
    } catch (err) {
        console.error("Error al cerrar Mongo en test:", err.message);
    }
    try {
        await db.end();
    } catch (err) {
        console.error("Error al cerrar TiDB en test:", err.message);
    }
});