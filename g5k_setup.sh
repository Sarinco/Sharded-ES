# Setup docker
g5k-setup-docker -t
# echo DOCKER_OPTS="--bip=192.168.42.1/24" | sudo tee /etc/default/docker
# sudo systemctl restart docker
docker network create proxy

# Setup nodejs
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 22

cd ./test/measurer; npm i
