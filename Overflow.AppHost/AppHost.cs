using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var compose = builder.AddDockerComposeEnvironment("production")
    .WithDashboard(dashboard => dashboard.WithHostPort(8080));

var keycloak = builder.AddKeycloak("keycloak", 6001)
    .WithEnvironment("KC_HTTP_ENABLED", "true")
    .WithEnvironment("KC_HOSTNAME_STRICT", "false")
    .WithEnvironment("VIRTUAL_HOST", "id.overflow.local")
    .WithEnvironment("VIRTUAL_PORT", "8080")
    .WithDataVolume("keycloak-data")
    .WithRealmImport("../infra/realms");

var postgres = builder.AddPostgres("postgres", port:5432)
    .WithDataVolume("postgres-data")
    .WithPgAdmin();
// var typesenseApiKey = builder.AddParameter("typesense-api-key", secret: true);
var typesenseApiKey = builder.Environment.IsDevelopment() ? builder.Configuration["Parameters:typesense-api-key"] 
                      ?? throw new InvalidOperationException("Missing parameter: typesense-api-key")
                      : "${TYPESENSE_API_KEY}";

var typesense = builder.AddContainer("typesense", "typesense/typesense", "29.0")
    .WithArgs("--data-dir", "/data", "--api-key", typesenseApiKey, "--enable-cors")
    .WithVolume("typesense-data", "/data")
    .WithEnvironment("TYPESENSE_API_KEY", typesenseApiKey)
    .WithHttpEndpoint(8108, 8108, name: "typesense");

var typesenseContainer = typesense.GetEndpoint("typesense");

var questionDb = postgres.AddDatabase("questionDb");

var rabbitMq = builder.AddRabbitMQ("messaging")
    .WithDataVolume("rabbitmq-data")
    .WithManagementPlugin(port: 15672);

var questionService = builder.AddProject<Projects.QuestionService>("question-service")
    .WithReference(keycloak)
    .WithReference(questionDb)
    .WithReference(rabbitMq)
    .WaitFor(keycloak)
    .WaitFor(questionDb)
    .WaitFor(rabbitMq);

var searchService = builder.AddProject<Projects.SearchService>("search-service")
    .WithEnvironment("typesense-api-key", typesenseApiKey)
    .WithReference(typesenseContainer)
    .WithReference(rabbitMq)
    .WaitFor(typesense)
    .WaitFor(rabbitMq);

var yarp = builder.AddYarp("gateway")
    .WithConfiguration(yarpBuilder =>
    {
        yarpBuilder.AddRoute("/questions/{**catch-all}", questionService);
        yarpBuilder.AddRoute("/tags/{**catch-all}", questionService);
        yarpBuilder.AddRoute("/search/{**catch-all}", searchService);
    })
    .WithHostPort(8001)
    .WithEnvironment("ASPNETCORE_URLS", "http://*:8001")
    .WithEnvironment("VIRTUAL_HOST", "api.overflow.local")
    .WithEnvironment("VIRTUAL_PORT", "8001")
    .WithEndpoint(port: 8001, targetPort: 8001, scheme: "http",
        name: "gateway", isExternal: true);

if (!builder.Environment.IsDevelopment())
{
    builder.AddContainer("nginx-proxy", "nginxproxy/nginx-proxy", "1.9")
        .WithEndpoint(80,  80, "nginx", isExternal: true)
        .WithBindMount("/var/run/docker.sock", "/tmp/docker.sock", true);
}

builder.Build().Run();