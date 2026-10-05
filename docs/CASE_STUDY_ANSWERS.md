# CA-II Case Study Answers
## Answer any two – Q1 and Q2

### Q1. Netflix

The 2008 database corruption exposed the weaknesses of Netflix's monolithic architecture. A major failure in a central database stopped DVD shipments for three days, showing that tightly coupled components created a single point of failure and made recovery difficult.

The main challenges were:
1. **Single point of failure:** A failure in a central database could interrupt a major business operation.
2. **Tight coupling:** Components in a monolithic system depend heavily on one another, so a failure can propagate across the application.
3. **Limited scalability:** Scaling the whole application is inefficient when only one component needs additional capacity.
4. **Difficult deployments:** Large monolithic releases are harder to test, deploy, and recover safely.
5. **Poor fault isolation:** The system could not easily isolate failures to a small service.
6. **Recovery risk:** Database failure demonstrated the need for systems that continue operating despite component failures.

Netflix addressed these issues through a gradual move toward **microservices**. Instead of keeping all functionality in one large application, capabilities were divided into smaller, independently deployable services. This allowed individual components to be scaled, updated, and recovered separately.

Netflix also pioneered **Chaos Engineering**, intentionally introducing controlled failures into production-like environments to discover weaknesses before unexpected failures occurred. The principle was that a distributed system should be tested against realistic failures rather than assuming every component will always work.

Together, microservices and Chaos Engineering improved resilience and scalability. Microservices reduced the blast radius of individual failures and allowed independent scaling and deployment. Chaos Engineering helped engineers identify hidden dependencies and failure modes. The overall DevOps approach therefore shifted the system from a fragile centralized architecture toward a continuously tested, fault-tolerant distributed architecture.

### Q2. Amazon

Amazon's early monolithic architecture created problems as the company grew. A large tightly coupled codebase contributed to outages, made changes risky, and slowed the release of new features. These problems directly affected customer experience and the speed at which Amazon could innovate.

Amazon introduced the **two-pizza team** concept, where teams were kept small enough that they could be fed with roughly two pizzas. The purpose was not simply team size; it was to create autonomous teams with clear ownership and fewer communication dependencies.

This organizational change worked together with a **microservices architecture**. Each team could own a service, develop it independently, test it, deploy it, and scale it without requiring the entire organization to coordinate a single large release.

The combination addressed the monolithic problems in several ways:

1. **Reduced dependency:** Small autonomous teams reduced cross-team coordination.
2. **Independent releases:** Services could be changed and deployed independently.
3. **Fault isolation:** Failure in one service did not necessarily bring down the whole platform.
4. **Faster experimentation:** Teams could release smaller changes and learn from results.
5. **Clear ownership:** Teams were responsible for the services they operated.
6. **Continuous delivery:** Smaller services made frequent automated deployments more practical.

This architecture and culture supported a **culture of continuous innovation**. Engineers could make smaller changes, validate them quickly, and release improvements without waiting for a large organization-wide release cycle. The case study's reported deployment frequency of approximately **one deployment every 11.7 seconds on average** illustrates the scale of this continuous-delivery model.
