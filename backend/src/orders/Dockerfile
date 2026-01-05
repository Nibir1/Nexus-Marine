# Use AWS Lambda Node.js 20 base image
FROM public.ecr.aws/lambda/nodejs:20

# Copy package.json and package-lock.json (from backend root)
# Note: We will set the build context to the 'backend' folder later in CDK
COPY package*.json ${LAMBDA_TASK_ROOT}/

# Install production dependencies only
RUN npm ci --only=production

# Copy the specific service code and shared code
COPY src/orders/ ${LAMBDA_TASK_ROOT}/src/orders/
# If you had shared code, you would copy it here too

# Set the CMD to your handler
CMD [ "src/orders/handler.handler" ]