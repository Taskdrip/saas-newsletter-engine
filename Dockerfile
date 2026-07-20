# ──────────────────────────────────────────────────────────────
# listmonk on Railway
# Uses the official listmonk image and adds a smart entrypoint
# that generates config.toml from environment variables.
# ──────────────────────────────────────────────────────────────
FROM listmonk/listmonk:v6.2.0

# Copy our entrypoint (runs before listmonk binary)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /listmonk

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["./listmonk"]
