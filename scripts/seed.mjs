import { pbkdf2Sync, randomBytes } from "crypto";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hashPassword(password) {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

const drivers = [
  { name: "Rodrigo Dela Cruz", email: "rodrigo.delacruz@email.com", password: "Driver001", type: "jeepney", plate: "ABC-1234", capacity: 18, operator: "Rodrigo Dela Cruz" },
  { name: "Elena Magpayo",     email: "elena.magpayo@email.com",    password: "Driver002", type: "bus",     plate: "BGC-3456", capacity: 60, operator: "Elena Magpayo" },
  { name: "Armando Bautista",  email: "armando.bautista@email.com", password: "Driver003", type: "tricycle",plate: "TRC-001",  capacity: 3,  operator: "Armando Bautista" },
  { name: "Florencia Torres",  email: "florencia.torres@email.com", password: "Driver004", type: "fx",      plate: "VWX-4567", capacity: 10, operator: "Florencia Torres" },
  { name: "Renato Dimaculangan",email: "renato.dim@email.com",      password: "Driver005", type: "bus",     plate: "JKL-7890", capacity: 60, operator: "Renato Dimaculangan" },
];

const commuters = [
  { name: "Maria Santos",   email: "maria.santos@email.com",    password: "Santos123" },
  { name: "Pedro Reyes",    email: "pedro.reyes@email.com",     password: "Reyes1234" },
  { name: "Ana Villanueva", email: "ana.villanueva@email.com",  password: "Villa1234" },
  { name: "Jose Mercado",   email: "jose.mercado@email.com",    password: "Mercado12" },
  { name: "Lorna Castillo", email: "lorna.castillo@email.com",  password: "Castillo1" },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const d of drivers) {
      const vehicleRes = await client.query(
        `INSERT INTO vehicles (type, plate_number, operator, capacity, status, driver_status, current_passengers, current_lat, current_lng)
         VALUES ($1, $2, $3, $4, 'inactive', 'offline', 0, 14.5995, 120.9842)
         ON CONFLICT (plate_number) DO UPDATE SET type = EXCLUDED.type
         RETURNING id`,
        [d.type, d.plate, d.operator, d.capacity]
      );
      const vehicleId = vehicleRes.rows[0].id;
      const hash = hashPassword(d.password);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, driver_vehicle_id)
         VALUES ($1, $2, $3, 'driver', $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, driver_vehicle_id = EXCLUDED.driver_vehicle_id`,
        [d.name, d.email, hash, vehicleId]
      );
      console.log(`Seeded driver: ${d.name}`);
    }

    for (const c of commuters) {
      const hash = hashPassword(c.password);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'commuter')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [c.name, c.email, hash]
      );
      console.log(`Seeded commuter: ${c.name}`);
    }

    console.log("Seeding complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
