#pragma warning disable ASPIRECERTIFICATES001
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
    .WithoutHttpsCertificate()
    .WithRealmImport("../infra/realms");

var postgres = builder.AddPostgres("postgres", port:5432)
    .WithDataVolume("postgres-data")
    .WithPgWeb();
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
var profileDb = postgres.AddDatabase("profileDb");

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

var profileService = builder.AddProject<Projects.ProfileService>("profile-service")
    .WithReference(keycloak)
    .WithReference(profileDb)
    .WithReference(rabbitMq)
    .WaitFor(keycloak)
    .WaitFor(profileDb)
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
        yarpBuilder.AddRoute("/test/{**catch-all}", questionService);
        yarpBuilder.AddRoute("/tags/{**catch-all}", questionService);
        yarpBuilder.AddRoute("/search/{**catch-all}", searchService);
        yarpBuilder.AddRoute("/profiles/{**catch-all}", profileService);
    });

if (builder.Environment.IsDevelopment())
{
    yarp.WithHostPort(8001);
}
else
{
   yarp
       .WithoutHttpsCertificate()
       .WithEnvironment("ASPNETCORE_URLS", "http://*:8001")
       .WithEndpoint(port: 8001, scheme: "http", targetPort: 8001, name: "gateway", isExternal: true)
       .WithEnvironment("VIRTUAL_HOST", "api.overflow.local")
       .WithEnvironment("VIRTUAL_PORT", "8001");
}


var webapp = builder.AddJavaScriptApp("webapp", "../webapp")
    .WithReference(keycloak)
    .WithHttpEndpoint(env: "PORT", port: 3000, targetPort: 4000)
    .WithEnvironment("VIRTUAL_HOST", "app.overflow.local")
    .WithEnvironment("VIRTUAL_PORT", "4000")
    .PublishAsDockerFile();

if (!builder.Environment.IsDevelopment())
{
    builder.AddContainer("nginx-proxy", "nginxproxy/nginx-proxy", "1.9")
        .WithEndpoint(80, 80, "nginx", isExternal: true)
        .WithEndpoint(443, 443, "nginx-ssl", isExternal: true)
        .WithBindMount("/var/run/docker.sock", "/tmp/docker.sock", true)
        .WithBindMount("../infra/devcerts", "/etc/nginx/certs", true);
    
    keycloak.WithEnvironment("KC_HOSTNAME", "https://id.overflow.local")
        .WithEnvironment("KC_HOSTNAME_BACKCHANNEL_DYNAMIC", "true");
}

builder.Build().Run();
#pragma warning restore ASPIRECERTIFICATES001