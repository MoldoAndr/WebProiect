FROM nginx:alpine

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Fix permissions issue by creating cache directories
RUN mkdir -p /var/cache/nginx && \
    mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx

# Create and set permissions for logging
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create and set permissions for html directory
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
