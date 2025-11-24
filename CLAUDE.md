# MCP Server Vacations - Docker Setup

This is a dockerized Model Context Protocol (MCP) server for searching Airbnb vacation rentals.

## Features

- Search Airbnb listings by location, dates, and guest constraints
- Filter by price range
- Get direct Airbnb listing URLs
- Pagination support for large result sets

## Prerequisites

- Docker and Docker Compose installed
- Claude Desktop or another MCP-compatible client

## Building the Docker Image

Build the Docker image using:

```bash
docker build -t mcp-server-vacations .
```

Or using Docker Compose:

```bash
docker-compose build
```

## Configuring with Claude Desktop

To use this MCP server with Claude Desktop, add it to your MCP settings configuration file:

**Location**: `~/.config/claude-code/mcp_settings.json` (Linux/Mac) or `%APPDATA%\claude-code\mcp_settings.json` (Windows)

Add the following configuration:

```json
{
  "mcpServers": {
    "vacations": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "mcp-server-vacations:latest"
      ]
    }
  }
}
```

## Using with Claude Code

Once configured, restart Claude Desktop. The MCP server will be available with the following tool:

### Tool: `search_airbnb`

Search for Airbnb vacation rentals with specific criteria.

**Parameters:**
- `location` (required): Location to search (city, region, or address)
- `checkIn` (optional): Check-in date in YYYY-MM-DD format
- `checkOut` (optional): Check-out date in YYYY-MM-DD format
- `adults` (optional): Number of adults (default: 1)
- `children` (optional): Number of children (default: 0)
- `infants` (optional): Number of infants (default: 0)
- `pets` (optional): Number of pets (default: 0)
- `minPrice` (optional): Minimum price per night in USD
- `maxPrice` (optional): Maximum price per night in USD
- `page` (optional): Page number for pagination (default: 1)

**Example Usage in Claude Code:**

```
Find me vacation rentals in Paris for 2 adults from 2025-01-15 to 2025-01-20,
budget between $100-300 per night
```

Claude will use the MCP server to search Airbnb and return:
- Listing titles
- Direct URLs to the listings
- Prices
- Ratings

**Example Output:**

```
Found 20 listings:

1. Cozy Apartment in Le Marais
   URL: https://www.airbnb.com/rooms/12345678
   Price: $150 / night
   Rating: 4.9 ★ (127 reviews)

2. Modern Studio near Eiffel Tower
   URL: https://www.airbnb.com/rooms/87654321
   Price: $200 / night
   Rating: 4.8 ★ (89 reviews)

...
```

## Running Standalone (Testing)

To test the server standalone:

```bash
# Build the image
docker build -t mcp-server-vacations .

# Run interactively
docker run -i --rm mcp-server-vacations
```

The server communicates via stdio and expects MCP protocol messages.

## Development

### Project Structure

```
.
├── src/
│   └── index.ts          # Main MCP server implementation
├── Dockerfile            # Docker container configuration
├── docker-compose.yml    # Docker Compose configuration
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
└── CLAUDE.md            # This file
```

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm start
```

## Troubleshooting

### Server not appearing in Claude Desktop

1. Check that your `mcp_settings.json` is properly formatted
2. Restart Claude Desktop completely
3. Verify the Docker image is built: `docker images | grep mcp-server-vacations`

### Connection errors

1. Ensure Docker is running
2. Check Docker logs: `docker logs mcp-vacations`
3. Verify the image runs: `docker run -i --rm mcp-server-vacations`

### No results returned

- Try broader search criteria
- Check that the location name is correct
- Remove date constraints to see if listings exist
- Airbnb's structure may change; the HTML parsing might need updates

## Limitations

- Web scraping may break if Airbnb changes their HTML structure
- Rate limiting may occur with excessive requests
- Results depend on Airbnb's availability at query time

## License

MIT
