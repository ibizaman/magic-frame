# Magic Frame Kubernetes installation manual

This document describes how to install Magic Frame on Kubernetes.
It is assumed that you have a Kubernetes cluster up and running, and you have `kubectl` configured to interact with it.
## Step 1: Create a Namespace
First, create a namespace for Magic Frame:
```bash
kubectl create namespace magic-frame
```
## Step 2: Create a Secret for Database Credentials
Magic Frame requires a database to store its data. You need to create a secret to store the database credentials:
```bash
kubectl create secret generic magic-frame-db-secret \
  --from-literal=username=your_db_username \
  --from-literal=password=your_db_password \
  --from-literal=host=your_db_host \
  --from-literal=port=your_db_port \
  --namespace=magic-frame
```
Replace `your_db_username`, `your_db_password`, `your_db_host`, and `your_db_port` with your actual database credentials.
## Step 3: Deploy Magic Frame
Now, you can deploy Magic Frame using the manifests provided in this document.
