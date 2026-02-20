FROM postgres:16-alpine
COPY init-keycloak-db.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/init-keycloak-db.sh
