# Stage 1: Build the JAR
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline

COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: 512MB-Tuned Runtime for Render Free Tier
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Strict memory caps so Render's 512MB container never crashes with Exit Code 137:
# -Xmx260m                   -> Max Heap: 260 MB
# -XX:MaxMetaspaceSize=100m  -> Max Class Metadata: 100 MB
# -XX:ReservedCodeCacheSize=48m -> Max JIT Code Cache: 48 MB (saves ~190MB off-heap)
# -XX:MaxDirectMemorySize=32m -> Max NIO Buffer: 32 MB
# -Xss256k                   -> 256KB per thread stack
# -XX:+UseSerialGC           -> Low-overhead Garbage Collector
# -XX:TieredStopAtLevel=1    -> Fast startup & lower native memory usage
ENTRYPOINT ["java", \
  "-Xmx260m", \
  "-Xms128m", \
  "-XX:MaxMetaspaceSize=100m", \
  "-XX:ReservedCodeCacheSize=48m", \
  "-XX:MaxDirectMemorySize=32m", \
  "-Xss256k", \
  "-XX:+UseSerialGC", \
  "-XX:TieredStopAtLevel=1", \
  "-Dserver.port=${PORT:8080}", \
  "-jar", "app.jar"]