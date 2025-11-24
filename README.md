# MCP Server Vacations

A dockerized Model Context Protocol (MCP) server for searching Airbnb vacation rentals. This server enables AI assistants like Claude to search for vacation accommodations with specific locations, dates, and constraints.

## Quick Start

1. **Build the Docker image:**
   ```bash
   docker build -t mcp-server-vacations .
   ```

2. **Configure Claude Desktop** by adding to your MCP settings:
   ```json
   {
     "mcpServers": {
       "vacations": {
         "command": "docker",
         "args": ["run", "-i", "--rm", "mcp-server-vacations:latest"]
       }
     }
   }
   ```

3. **Restart Claude Desktop** and start searching for vacation rentals!

## Features

- Search by location, dates, and guest requirements
- Price range filtering
- Returns direct Airbnb listing URLs
- Pagination support

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed setup instructions and usage examples.

## Requirements

- Docker
- Node.js 18+ (for local development)
- Claude Desktop or MCP-compatible client

## License

MIT
