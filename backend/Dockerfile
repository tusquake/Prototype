# Stage 1: Build Java Application using Maven
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build production jar
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Minimal JRE Runtime Environment
FROM eclipse-temurin:17-jre
WORKDIR /app

# Create unprivileged user for security (Debian/Ubuntu syntax)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy compiled JAR from builder stage
COPY --from=builder /app/target/finsop-backend-1.0.0-SNAPSHOT.jar app.jar

# Expose backend REST API port
EXPOSE 8080

# Environment Defaults
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xms256m -Xmx512m"

USER appuser

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]