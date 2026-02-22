-- إنشاء المستخدم وقاعدة البيانات Sahalat
-- شغّل من مجلد backend: psql -U postgres -f prisma/init-db.sql

CREATE USER ali WITH LOGIN PASSWORD 'sahalat@1234';
CREATE DATABASE sahalatdb OWNER ali;

\c sahalatdb
GRANT ALL ON SCHEMA public TO ali;
GRANT CREATE ON SCHEMA public TO ali;
