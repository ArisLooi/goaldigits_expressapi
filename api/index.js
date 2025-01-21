// Importing Modules
let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function getPostgresVersion() {
    const client = await pool.connect();
    try {
        const response = await client.query("SELECT version()");
        console.log(response.rows[0]);
    } finally {
        client.release();
    }
}

getPostgresVersion();

// Create a new transaction
app.post("/transactions", async (req, res) => {
    const client = await pool.connect();
    try {
        const data = {
            uid: req.body.uid,
            category: req.body.category,
            amount: req.body.amount,
            transactiondate: req.body.transactiondate,
            description: req.body.description,
            type: req.body.type,
            image_url: req.body.image_url,
        };
        console.log("Data", data);
        const query =
            "INSERT INTO transactions (uid, category, amount, transactiondate, description, type, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING transactionid";
        const params = [
            data.uid,
            data.category,
            data.amount,
            data.transactiondate,
            data.description,
            data.type,
            data.image_url,
        ];

        const result = await client.query(query, params);
        data.transactionid = result.rows[0].transactionid;

        console.log(
            `Transaction created successfully with transactionid: ${data.transactionid}`,
        );
        res.json({
            status: "success",
            data: data,
            message: "Transaction created successfully",
        });
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Retrieve a single transaction by ID
app.get("/transactions/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const transactionId = req.params.id;
        const query = "SELECT * FROM transactions WHERE transactionid = $1";
        const result = await client.query(query, [transactionId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Transaction not found" });
        } else {
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Update an existing transaction by ID
app.put("/transactions/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const transactionId = req.params.id;
        const data = {
            category: req.body.category,
            amount: req.body.amount,
            transactiondate: req.body.transactiondate,
            description: req.body.description,
            type: req.body.type,
            image_url: req.body.image_url,
        };
        const query =
            "UPDATE transactions SET category = $1, amount = $2, transactiondate = $3, description = $4, type = $5, image_url = $6 WHERE transactionid = $7 RETURNING *";
        const params = [
            data.category,
            data.amount,
            data.transactiondate,
            data.description,
            data.type,
            data.image_url,
            transactionId,
        ];

        const result = await client.query(query, params);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Transaction not found" });
        } else {
            res.json({
                status: "success",
                data: result.rows[0],
                message: "Transaction updated successfully",
            });
        }
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete a transaction by ID
app.delete("/transactions/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const transactionId = req.params.id;
        const query =
            "DELETE FROM transactions WHERE transactionid = $1 RETURNING *";
        const result = await client.query(query, [transactionId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Transaction not found" });
        } else {
            res.json({
                status: "success",
                data: result.rows[0],
                message: "Transaction deleted successfully",
            });
        }
    } catch (error) {
        console.error("Error: ", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Retrieve transactions by user ID
app.get("/transactions/uid/:uid", async (req, res) => {
    const { uid } = req.params;
    const client = await pool.connect();

    try {
        const transactions = await client.query(
            "SELECT * FROM transactions WHERE uid=$1",
            [uid],
        );
        if (transactions.rowCount > 0) {
            res.json(transactions.rows);
        } else {
            res
                .status(404)
                .json({ error: "No transactions found for the given user" });
        }
    } catch (error) {
        console.error("Error", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// // Fetch transactions by user ID and type
// app.get("/transactions/uid/:uid/type/:type", async (req, res) => {
//   const { uid, type } = req.params;
//   const client = await pool.connect();

//   try {
//     const query =
//       "SELECT * FROM transactions WHERE uid = $1 AND type = $2 ORDER BY transactiondate";
//     const result = await client.query(query, [uid, type]);

//     if (result.rows.length > 0) {
//       res.json(result.rows);
//     } else {
//       res
//         .status(404)
//         .json({ error: "No transactions found for the given user and type" });
//     }
//   } catch (error) {
//     console.error("Error fetching transactions:", error.message);
//     res.status(500).json({ error: error.message });
//   } finally {
//     client.release();
//   }
// });

// Get Endpoint
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});

// Catch 404 and forward to error handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname + "/404.html"));
});

app.listen(3000, () => {
    console.log("App is listening on port 3000");
});
