# ---------- Stage 1: build the jar ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Copy pom first so the dependency layer is cached when only source code changes
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---------- Stage 2: runtime image ----------
# Ubuntu-based JRE: multi-arch (amd64 + arm64). The -alpine variant is x86_64-only.
FROM eclipse-temurin:17-jre
WORKDIR /app
# Run as a non-root user (least privilege)
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build /app/target/*.jar app.jar
USER app
EXPOSE 8080
# Container-aware JVM: size heap from the container memory limit, not the host's
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
