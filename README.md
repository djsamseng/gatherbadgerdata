
## Installation
```bash
cd server && yarn install
```
```bash
cd client && yarn install
```
```bash
supabase init
```

## Local Database Data Setup
1. Copy and paste SQL from client/src/DataClient.ts to create tables and rpc's
2. Start server and client
3. In localhost:3000 press Init Local Database

## Run
```bash
cd server && yarn start
```
```bash
cd client && yarn start
```
```bash
sudo service docker start
sudo supabase start
```

Create client/.env with
```
REACT_APP_SUPABASE_URL="url_from_supabase_start"
REACT_APP_SUPABASE_ANON_KEY="anon_from_supabase_start"
REACT_APP_SUPABASE_SERVICE_KEY="service_key_from_supabase_start"
```

- In Supabase Studio use the sql editor to create tables. See `server/src/app.ts` for create table SQL
- Enable row level security for gifts, tags and search_index (this blocks all access except for the service key)
- Add policies to allow reads for gifts, tags and search_index
