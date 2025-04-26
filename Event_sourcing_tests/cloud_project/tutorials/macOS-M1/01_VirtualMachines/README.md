# :books: Lab Session 1: Virtual Machines

**LINFO2145 Autumn, 2023** -- *Etienne Rivière, Donatien Schmitz, Yinan Cao, and Samy Bettaieb*

## Objectives

The goal of this tutorial is to show you how to set up a virtualized infrastructure similar to a remote cloud IaaS, on your own laptop.
This virtualized infrastructure will feature several virtual machines (VMs).
The virtual machine template you will build during this session will be reused for all tutorials and for the project.
As an additional exercise, you will deploy a Web hosting service as an example of an application running over multiple VMs.

At the end of this tutorial, you will know how to:

- create and deploy Virtual Machines (VMs);
- install and deploy a multi-tier web application using several VMs.

:warning:
We encourage you to **follow the tutorial solo**.

:warning:
This tutorial requires you to complete some exercises, which are tagged with this icon: :pencil2:

:warning:
**Prerequisites.** Before you continue, click on [THIS LINK](Prerequisites.md) to install the required software.

## Setup a virtual infrastructure with Multipass

In this section, you will learn how to configure and create a new Virtual Machine (VM), how to create templates to deploy multiple identical VMs, and how to deploy multiple VMs on the same host (your laptop). VMs host a minimalistic GNU/Linux Operating System (OS) with a reduced number of software packages.

:bulb:
We also want to limit the number of resources used by each VM (hard drive space, CPU, memory).

:warning:
From now on, you will be asked to write down different commands in a terminal of your laptop. For this tutorial the working directory is the folder `tutorials/01_VirtualMachines`, open a terminal and be sure to be in this directory.

### Create and set up your first VM

We start by creating a new (empty) VM and registering it with the name: **myvm**.

```bash
# creates a default Ubuntu VM
multipass launch -n myvm
```

Congratulations, you have just launched your first Ubuntu VM with Multipass! The default hardware specification of the VMs you create is as follows:
- CPU: 1 CPU
- Memory: 1GB RAM
- Disk: 5GB
- Network: Host
  
To make sure that this is correct we can prompt a new remote terminal with the Multipass utility `shell`:

```bash
# Spawn a terminal
$ multipass shell myvm

Welcome to Ubuntu 20.04.4 LTS (GNU/Linux 5.4.0-125-generic aarch64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  System information as of Thu Sep 15 15:01:46 CEST 2022

  System load:             0.1
  Usage of /:              27.6% of 4.68GB
  Memory usage:            20%
  Swap usage:              0%
  Processes:               103
  Users logged in:         0
  IPv4 address for enp0s1: 192.168.64.7
  IPv6 address for enp0s1: fde7:e054:8353:7290:5054:ff:fed8:a1ec


0 updates can be applied immediately.


The list of available updates is more than a week old.
To check for new updates run: sudo apt update
New release '22.04.1 LTS' available.
Run 'do-release-upgrade' to upgrade to it.


To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ubuntu@myvm:~$
```
We can notice that there is indeed 5GB of disk available. The `free -m` shows us that we have 1000MB of RAM and `cat /proc/cpuinfo  | grep process| wc -l` tells us that we have 1 CPU. We can also see that our VM is using our host local network and we can reach it if we try to ping it. You can retrieve the VM ip address with `ip a` on the interface `enp0s1`.
```bash
# from the host machine
$ ping 192.168.64.7
PING 192.168.64.7 (192.168.64.7): 56 data bytes
64 bytes from 192.168.64.7: icmp_seq=0 ttl=64 time=0.600 ms
64 bytes from 192.168.64.7: icmp_seq=1 ttl=64 time=1.031 ms
```

### Create a custom hardware requirement

It is easy to create Ubuntu VMs with custom hardware requirement with the following flags: `--cpus, --disk, --memory`

```bash
# creates a custom VM
$ multipass launch -n my-custom-vm --cpus 2 --memory 5G --disk 10G
```

### Access the guest OS from your laptop
We previously used the multipass utility `shell` to connect to our VM remotely but we would like to access it from anywhere with SSH.

:pencil2: From a terminal **on the host system** (laptop), run `ssh ubuntu@GUEST_OS_IP_ADDRESS`.
Type `yes` to accept the key fingerprint. You should then see a message telling you that you don't have permission to connect to this host. This is because we haven't set up the information needed to tell the VM that we do have permission to access it.

#### Login using an RSA key pair

We will set up a [RSA key pair](https://en.wikipedia.org/wiki/Public-key_cryptography) on the host OS and use it for automated authentication in the guest VM OS.

Follow the instructions [HERE](RSAKeyPair.md) to configure your host and guest VM with RSA authentication.

## Launching multiple VMs

Now that we have set up one VM with a minimalistic guest OS, we want to be able to launch new instances or clones of this VM.

### Cloud-init

The manual configuration of multiple identical VM can quickly become cumbersome. Thankfully, we are lazy computer scientists and we would like to automate some of the boring operations we just did, like copying our RSA key.

The way to do this with Multipass is to create what is called a [**Cloud init**](https://cloudinit.readthedocs.io/en/latest/topics/examples.html) file, a file containing instructions of operations to be performed on a newly created VM, like install packages with `apt-get install`, modify some files, configure network interfaces, create new users, ...

To show you a simple example, we will add our public RSA key to a newly created VM with the following steps:

1. Create a new file called `cloud-init.yaml` with `nano cloud-init.yaml`
2. Copy the following content: 
   ```yaml
    #cloud-config
    ssh_authorized_keys:
        - your-rsa-public-key
   ```
3. Save and quit the file.
4. Launch a new VM with `multipass launch -n myvm-2 --cloud-init cloud-init.yaml`
5. Connect via SSH with `ssh ubuntu@IP_OF_YOUR_NEW_VM`

:warning: You should now have two VMs, `myvm` and `myvm-2`. If not, make sure you followed the last step with Cloud-init.

## Final comments

:checkered_flag: **Congrats, you complete your first tutorial.**
You learned how to deployed a virtual infrastructure with some VMs and set up a connection (via SSH) to the guest OSs from your laptop. You may want to make use of this infrastructure for deploying an application. As an additional exercise, [this tutorial](DeployWebApp.md) shows you how to deploy a Web hosting service on your virtual infrastructure.
