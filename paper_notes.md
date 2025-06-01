# Notes on different papers for the state of the art

## Software defined Internet Architecture : Decoupling Architecture from infrastructure

coupling between network architecture and network infrastructure, irrelevant for us

## Development Frameworks for Microservice-based Applications: Evaluation and Comparison

https://arxiv.org/pdf/2203.07267

Paper about the new microservice architecture opposed to the monolithic one. Put the emphasis on the fact that there can be infrastructure services that can be portable from one app to another. This allows programmers to focus on the part of the app that are arbitrary. However, problems in conventions make the interoperability difficult

→ Might be useful to talk about microservices a little and say why our app falls in that category of "infrastructure services"

→ Might also read the paper further to see what standards they come up with and if those are interesting in our case

## Toward Organizational Decoupling in Microservices Through Key Developer Allocation

https://arxiv.org/pdf/2501.17522

Study on the apparition of organizational coupling when developers work on multiple microservices at once. Approach to identify these developers and link them to organizational coupling

→ **n** I don't think this paper will be relevant in our case

## In Search for a Scalable & Reactive Architecture of a Cloud Application: CQRS and Event Sourcing Case Study

http://galaxy.agh.edu.pl/~malawski/DebskiSzczepanik-CQRS-IEEE-Software.pdf

Implementation of a "simple" Event Sourcing application to test its performances. Includes the CQRS pattern. The main target is implementing a real world example to test the scalability. 
 Talk about how to implement it using small building block first, and then trying out various technologies

--> Might be interesting to talk about since could justify the choice for kafka. Could also help us convince that Event Sourcing is a good tech and that there is a need for more Event Sourced examples and experimentations to contribute to its adoption.

**Mention of sharding in this paper** It is also present in the state of the art of the next paper, making it a resource to consider more deeply

## Creation of a replicated Event Sourcing Application

https://estudogeral.uc.pt/retrieve/265557/AxonIQCompany

**Might be the most useful state of the art so far**
Why : Explains a deployment of an event sources app in a multi-site environment. This is different from us because in that thesis they replicate all the events everywhere while we are one step further, i.e. make use of sharding to optimize it. This paper needs to be read thoroughly because it could represent a significant chunk of our state of the art.

## Simplifying Distributed Database Systems Design by Using a Broadcast Network

https://dl.acm.org/doi/pdf/10.1145/971697.602290

→ Not relevant for us

## Simplifying Distributed System Development

https://www.usenix.org/legacy/event/hotos09/tech/full_papers/yabandeh/yabandeh.pdf

paper about a method to reduce the complexity in distributed systems while developing

→ Might be useful to read a bit more, to maybe say that our research gets into a more global effort to simplify distributed environment?

## Design and implementation of a cloud‑based event‑driven architecture for real‑time data processing in wireless sensor networks

→ Kind of not relevant for us

## Architecture Simplification at Large Institutions using Micro Services

Redesign of monolithic applications using microservices. 

→ Might be useful for microservice justification. But less than the one above imo.

## 

