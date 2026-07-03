# Persistent Volumes (PV)

Persistent Volumes (PV) are a key component of Kubernetes that provide a way to manage storage resources in a cluster. They allow users to decouple storage from the lifecycle of individual pods, enabling data persistence across pod restarts and failures.

Below PVs can be used, but are not always necessary. For example, when running on K3S with Rancher, the default storage class is `local-path`, which automatically provisions storage for pods. However, if you want to use a specific storage class or manage your own persistent volumes, you can define PVs as shown below.
## Caddy conf PV

Is used for storing Caddy configuration files. This allows the Caddy server to persist its configuration even if the pod is restarted or recreated. The PV is defined with a `hostPath` that points to a directory on the host machine, and it is set to retain data even if the PV is deleted.

```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-caddy-conf-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-caddy-conf-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
  # Path depends on you local setup, this is for K3S with Rancher
    path: /var/lib/rancher/k3s/storage/magic-frame-caddy-conf-pv
    type: DirectoryOrCreate
```

## Caddy configuration PV

Is used for storing Caddy configuration files. This allows the Caddy server to persist its configuration even if the pod is restarted or recreated. The PV is defined with a `hostPath` that points to a directory on the host machine, and it is set to retain data even if the PV is deleted.

```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-caddy-config-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-caddy-config-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
  # Path depends on you local setup, this is for K3S with Rancher
    path: /var/lib/rancher/k3s/storage/magic-frame-caddy-config-pv
    type: DirectoryOrCreate
```

## Caddy data PV

Is used for storing Caddy data files. This allows the Caddy server to persist its data even if the pod is restarted or recreated. The PV is defined with a `hostPath` that points to a directory on the host machine, and it is set to retain data even if the PV is deleted.
```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-caddy-data-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-caddy-data-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
  # Path depends on you local setup, this is for K3S with Rancher
    path: /var/lib/rancher/k3s/storage/magic-frame-caddy-data-pv
    type: DirectoryOrCreate
```
## Magic Frame configs PV

Is used for storing Magic Frame configuration files. 
```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-configs-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-configs-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
  # Path depends on you local setup, this is for K3S with Rancher
    path: /var/lib/rancher/k3s/storage/magic-frame-configs-pv 
    type: DirectoryOrCreate
    
```
## Magic Frame database PV
Is used for storing Magic Frame database files.
```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-pgdata-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-pgdata-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    # Path depends on you local setup, this is for K3S with Rancher
    path: /var/lib/rancher/k3s/storage/magic-frame-pgdata-pv
    type: DirectoryOrCreate
```
## Magic Frame wallpapers PV
Is used for storing Magic Frame wallpapers. 
```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: magic-frame-wallpapers-pv
  namespace: magic-frame
spec:
  claimRef:
    namespace: magic-frame
    name: magic-frame-wallpapers-pvc
  storageClassName: magic-frame-storage
  capacity:
    storage: 100Mi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /var/lib/rancher/k3s/storage/magic-frame-wallpapers-pv
    type: DirectoryOrCreate
