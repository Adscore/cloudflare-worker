import { inet_pton } from "locutus/php/network/inet_pton";

// from https://cloudflare.com/ips-v6/#
export const cloudflareIpAddresses = [
  inet_pton("2400:cb00::/32"),
  inet_pton("2606:4700::/32"),
  inet_pton("2803:f800::/32"),
  inet_pton("2405:b500::/32"),
  inet_pton("2405:8100::/32"),
  inet_pton("2a06:98c0::/29"),
  inet_pton("2c0f:f248::/32"),
];
