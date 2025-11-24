#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as cheerio from "cheerio";
import { request } from "https";

const server = new Server(
  {
    name: "mcp-server-vacations",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

interface SearchParams {
  location: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
}

async function fetchAirbnbSearch(params: SearchParams): Promise<string> {
  const {
    location,
    checkIn,
    checkOut,
    adults = 1,
    children = 0,
    infants = 0,
    pets = 0,
    minPrice,
    maxPrice,
    page = 1,
  } = params;

  const searchParams = new URLSearchParams();

  // Location
  searchParams.append("query", location);

  // Dates
  if (checkIn) searchParams.append("checkin", checkIn);
  if (checkOut) searchParams.append("checkout", checkOut);

  // Guests
  const totalGuests = adults + children;
  if (totalGuests > 0) searchParams.append("adults", totalGuests.toString());
  if (infants > 0) searchParams.append("infants", infants.toString());
  if (pets > 0) searchParams.append("pets", pets.toString());

  // Price range
  if (minPrice !== undefined) searchParams.append("price_min", minPrice.toString());
  if (maxPrice !== undefined) searchParams.append("price_max", maxPrice.toString());

  // Pagination
  const itemsPerPage = 20;
  const offset = (page - 1) * itemsPerPage;
  if (offset > 0) searchParams.append("items_offset", offset.toString());

  const url = `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?${searchParams.toString()}`;

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.end();
  });
}

function parseAirbnbListings(html: string): Array<{
  title: string;
  url: string;
  price?: string;
  rating?: string;
  description?: string;
}> {
  const $ = cheerio.load(html);
  const listings: Array<{
    title: string;
    url: string;
    price?: string;
    rating?: string;
    description?: string;
  }> = [];

  // Airbnb uses data attributes and specific class patterns
  // This is a simplified parser - actual implementation may need adjustment
  $('a[href*="/rooms/"]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr("href");

    if (href && !listings.find(l => l.url === href)) {
      const title = $el.find('[data-testid="listing-card-title"]').text().trim() ||
                   $el.text().trim().split('\n')[0] ||
                   "Listing";

      const price = $el.find('[data-testid="price-availability-row"]').text().trim() ||
                   $el.find('span:contains("$")').first().text().trim();

      const rating = $el.find('[aria-label*="rating"]').attr("aria-label") ||
                    $el.find('span:contains("★")').text().trim();

      const fullUrl = href.startsWith("http") ? href : `https://www.airbnb.com${href.split("?")[0]}`;

      listings.push({
        title,
        url: fullUrl,
        price: price || undefined,
        rating: rating || undefined,
      });
    }
  });

  return listings;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_airbnb",
        description: "Search for Airbnb vacation rentals with specific location, dates, and constraints. Returns listing URLs and details.",
        inputSchema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Location to search (city, region, or address)",
            },
            checkIn: {
              type: "string",
              description: "Check-in date (YYYY-MM-DD format)",
            },
            checkOut: {
              type: "string",
              description: "Check-out date (YYYY-MM-DD format)",
            },
            adults: {
              type: "number",
              description: "Number of adults (default: 1)",
              default: 1,
            },
            children: {
              type: "number",
              description: "Number of children (default: 0)",
              default: 0,
            },
            infants: {
              type: "number",
              description: "Number of infants (default: 0)",
              default: 0,
            },
            pets: {
              type: "number",
              description: "Number of pets (default: 0)",
              default: 0,
            },
            minPrice: {
              type: "number",
              description: "Minimum price per night in USD",
            },
            maxPrice: {
              type: "number",
              description: "Maximum price per night in USD",
            },
            page: {
              type: "number",
              description: "Page number for pagination (default: 1)",
              default: 1,
            },
          },
          required: ["location"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "search_airbnb") {
    const params = request.params.arguments as unknown as SearchParams;

    try {
      const html = await fetchAirbnbSearch(params);
      const listings = parseAirbnbListings(html);

      if (listings.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No listings found for the specified criteria. Try adjusting your search parameters.",
            },
          ],
        };
      }

      const resultText = listings
        .map(
          (listing, idx) =>
            `${idx + 1}. ${listing.title}\n` +
            `   URL: ${listing.url}\n` +
            `   Price: ${listing.price || "N/A"}\n` +
            `   Rating: ${listing.rating || "N/A"}\n`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${listings.length} listings:\n\n${resultText}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error searching Airbnb: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Vacations Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
