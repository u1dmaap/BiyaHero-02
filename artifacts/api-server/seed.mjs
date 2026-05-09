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
  { name: "Rodrigo Dela Cruz",    email: "rodrigo.delacruz@email.com",  password: "Driver001", type: "jeepney",  plate: "ABC-1234", capacity: 18, operator: "Rodrigo Dela Cruz",    lat: 13.7565, lng: 121.0583, status: "active",   driverStatus: "on_trip" },
  { name: "Elena Magpayo",        email: "elena.magpayo@email.com",      password: "Driver002", type: "bus",      plate: "BGC-3456", capacity: 60, operator: "Elena Magpayo",        lat: 13.9411, lng: 121.1631, status: "active",   driverStatus: "available" },
  { name: "Armando Bautista",     email: "armando.bautista@email.com",   password: "Driver003", type: "tricycle", plate: "TRC-001",  capacity: 3,  operator: "Armando Bautista",     lat: 13.9792, lng: 121.0742, status: "active",   driverStatus: "available" },
  { name: "Florencia Torres",     email: "florencia.torres@email.com",   password: "Driver004", type: "fx",       plate: "VWX-4567", capacity: 10, operator: "Florencia Torres",     lat: 14.1035, lng: 121.0436, status: "active",   driverStatus: "on_trip" },
  { name: "Renato Dimaculangan",  email: "renato.dim@email.com",         password: "Driver005", type: "bus",      plate: "JKL-7890", capacity: 60, operator: "Renato Dimaculangan",  lat: 13.8793, lng: 120.9010, status: "active",   driverStatus: "available" },
  { name: "Carlos Mangubat",      email: "carlos.mangubat@email.com",    password: "Driver006", type: "jeepney",  plate: "BTG-001",  capacity: 18, operator: "Carlos Mangubat",      lat: 13.7612, lng: 121.0521, status: "active",   driverStatus: "available" },
  { name: "Rowena Hernandez",     email: "rowena.hernandez@email.com",   password: "Driver007", type: "tricycle", plate: "BTG-002",  capacity: 3,  operator: "Rowena Hernandez",     lat: 13.8449, lng: 121.2059, status: "active",   driverStatus: "available" },
  { name: "Benjamin Ilagan",      email: "benjamin.ilagan@email.com",    password: "Driver008", type: "bus",      plate: "BTG-003",  capacity: 55, operator: "Benjamin Ilagan",      lat: 13.7942, lng: 121.0079, status: "active",   driverStatus: "on_trip" },
  { name: "Maricel Aguilar",      email: "maricel.aguilar@email.com",    password: "Driver009", type: "fx",       plate: "BTG-004",  capacity: 10, operator: "Maricel Aguilar",      lat: 13.9330, lng: 120.8121, status: "active",   driverStatus: "available" },
  { name: "Danilo Ramos",         email: "danilo.ramos@email.com",       password: "Driver010", type: "jeepney",  plate: "BTG-005",  capacity: 18, operator: "Danilo Ramos",         lat: 13.8701, lng: 121.0930, status: "active",   driverStatus: "available" },
  { name: "Teresita Pangilinan",  email: "teresita.pangilinan@email.com",password: "Driver011", type: "tricycle", plate: "BTG-006",  capacity: 3,  operator: "Teresita Pangilinan",  lat: 14.0702, lng: 120.6236, status: "active",   driverStatus: "available" },
  { name: "Alfredo Gatchalian",   email: "alfredo.gatchalian@email.com", password: "Driver012", type: "bus",      plate: "BTG-007",  capacity: 60, operator: "Alfredo Gatchalian",   lat: 13.8260, lng: 121.3969, status: "active",   driverStatus: "on_trip" },
  { name: "Nelia Ocampo",         email: "nelia.ocampo@email.com",       password: "Driver013", type: "jeepney",  plate: "BTG-008",  capacity: 18, operator: "Nelia Ocampo",         lat: 13.6484, lng: 121.2283, status: "active",   driverStatus: "available" },
  { name: "Rodrigo Macaraeg",     email: "rodrigo.macaraeg@email.com",   password: "Driver014", type: "fx",       plate: "BTG-009",  capacity: 10, operator: "Rodrigo Macaraeg",     lat: 13.7855, lng: 121.1042, status: "active",   driverStatus: "available" },
  { name: "Lito Evangelista",     email: "lito.evangelista@email.com",   password: "Driver015", type: "jeepney",  plate: "BTG-010",  capacity: 18, operator: "Lito Evangelista",     lat: 13.9150, lng: 121.0880, status: "inactive", driverStatus: "offline" },
];

const commuters = [
  { name: "Maria Santos",       email: "maria.santos@email.com",       password: "Santos123" },
  { name: "Pedro Reyes",        email: "pedro.reyes@email.com",        password: "Reyes1234" },
  { name: "Ana Villanueva",     email: "ana.villanueva@email.com",     password: "Villa1234" },
  { name: "Jose Mercado",       email: "jose.mercado@email.com",       password: "Mercado12" },
  { name: "Lorna Castillo",     email: "lorna.castillo@email.com",     password: "Castillo1" },
  { name: "Gina Tolentino",     email: "gina.tolentino@email.com",     password: "Tolen1234" },
  { name: "Ramon Dizon",        email: "ramon.dizon@email.com",        password: "Dizon1234" },
  { name: "Cynthia Borja",      email: "cynthia.borja@email.com",      password: "Borja1234" },
  { name: "Eduardo Atienza",    email: "eduardo.atienza@email.com",    password: "Atienz123" },
  { name: "Nellie Manalang",    email: "nellie.manalang@email.com",    password: "Mana1234" },
  { name: "Jaime Buenaventura", email: "jaime.buenaventura@email.com", password: "Buena1234" },
  { name: "Corazon Dela Torre", email: "corazon.delatorre@email.com",  password: "Torre1234" },
  { name: "Renante Salazar",    email: "renante.salazar@email.com",    password: "Salaz1234" },
  { name: "Marilyn Tolosa",     email: "marilyn.tolosa@email.com",     password: "Tolosa123" },
  { name: "Francis Manalo",     email: "francis.manalo@email.com",     password: "Mana12345" },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const d of drivers) {
      const vehicleRes = await client.query(
        `INSERT INTO vehicles (type, plate_number, operator, capacity, status, driver_status, current_passengers, current_lat, current_lng)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
         ON CONFLICT (plate_number) DO UPDATE SET
           type = EXCLUDED.type,
           status = EXCLUDED.status,
           driver_status = EXCLUDED.driver_status,
           current_lat = EXCLUDED.current_lat,
           current_lng = EXCLUDED.current_lng
         RETURNING id`,
        [d.type, d.plate, d.operator, d.capacity, d.status, d.driverStatus, d.lat, d.lng]
      );
      const vehicleId = vehicleRes.rows[0].id;
      const hash = hashPassword(d.password);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, driver_vehicle_id)
         VALUES ($1, $2, $3, 'driver', $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, driver_vehicle_id = EXCLUDED.driver_vehicle_id`,
        [d.name, d.email, hash, vehicleId]
      );
      console.log(`Seeded driver: ${d.name} (${d.type} @ ${d.lat}, ${d.lng})`);
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
