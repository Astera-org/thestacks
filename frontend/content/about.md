Science advances by sharing **knowledge** and **data**.
These are the building blocks that let others learn, build on prior work, and grow our collective understanding of the world.
The Stacks is an [Astera Institute](https://astera.org) initiative to build technologies and services that make the products of science as useful and reusable as possible.

We run The Stacks publishing service as a demonstration of the ideas below, and develop the Raven backend as an open source tool that other communities or organizations can deploy and adapt for their own publishing needs.
Our goal is to show a better way of working and to clear a path for others to build on.

**Note**: The Stacks is a young project, and it is evolving rapidly at a project and technical level. Things might change a bit as we learn what works!

## What we believe

We aim to re-think the technologies, practices, and organizations that enable us to communicate scientific knowledge, and to move towards the future rather than being anchored in the past.
We believe that:

- Research should be shared in ways that leverage the expression and flexibility of the web.
- Code and data should be essential parts of a publication, with products that empower both authors and readers to make the most use of them.
- Systems should be designed so that AI can be easily and safely used to both understand and create scientific knowledge.
- Organizations that enable scientific communication should relentlessly pursue scientific value to the world, rather than being mired in proxies for value like institutional prestige.

The Stacks exists to make scientific knowledge as useful as possible: for reading and learning, for reuse and iteration, by both humans and machines.
We draw on the history of scientific publishing without being limited by it, adopting current technologies and discarding practices that no longer serve the scientific community.

### Product principles

A few key product principles guide The Stacks:

- **Author empowerment.** An author should be able to share their work whenever they want, without gatekeeping and pre-publication filters.
- **Reader empowerment.** A reader can decide what content to engage with, and should be equipped with all the information they need to assess the validity or quality of an argument.
- **Reusability.** Content on The Stacks should be accessible and structured so that both humans and machines can easily inspect and reuse it for their own purposes.
- **Experimentation and learning.** The Stacks should enable experimentation and learning in how to improve scientific communication in a way that others can learn from and build upon.

## The Stacks publishing service

The Stacks publishing service is our attempt at building the best possible publishing platform for our community of scientists.
It is opinionated and ever-changing as we learn more about what works and what doesn't.
Today, it publishes work from the Astera Institute and its affiliated organizations.

At its core, we imagine the product of The Stacks as a _feed_ of structured, information-dense scientific content of all shapes and sizes, available to anyone in the world.
This feed won't attempt to tell readers what they should or should not read.
Instead, content should have all the metadata required for a reader, machine or service to apply its own judgment in deciding how to digest information from the feed.

Want to create an overlay service that applies algorithmic recommendations for readers based on a feed from The Stacks?
That's great.
Want to programmatically gather all of the content in the feed to run a meta-analysis of statistical methodologies across Astera and [Arcadia Science](https://www.arcadiascience.com)?
The Stacks should make this simple.

:::{figure} /about/publishing-loop.svg
:alt: A loop: authors publish structured content to The Stacks, which produces a feed that downstream readers, machines, and services consume.
:enumerated: false

The publishing loop: authors publish when they're ready, and anyone can read, analyze, or build on the structured feed.
:::

## Raven, our open source backend

We also believe that reusability should apply to technology, not only to scientific ideas.
For this reason, we're building The Stacks on top of an ecosystem of open source tools that allow others to deploy their own services like The Stacks, making their own choices along the way.

The key backend technology behind The Stacks is called Raven.
It's an open source system designed so that anyone can run their own scientific content service, similar to The Stacks.
They can apply their own branding, make entirely different decisions about user interface and user experience, or apply new policies such as authentication.
Our goal is for The Stacks to be _one_ user of the Raven backend, and we welcome others to build with us as we continue to improve it.

We're also committing to building Raven on top of open technology wherever possible.
We want The Stacks to be a mechanism for enhancing and supporting the technology ecosystems that make it possible, and we will do so by using open source infrastructure and contributing back wherever we can.

:::{figure} /about/raven-stack.svg
:alt: A stack of layers: TheStacks.org and other Raven deployments on top, the Raven backend in the middle, and open source tools underneath.
:enumerated: false

Raven is the backend behind The Stacks, and it's open source. Anyone can deploy their own instance of Raven and configure it however they wish.
:::

## What we're learning

We believe that we're at a unique inflection point, where a new way of sharing scientific knowledge is not only possible, but likely.

The Stacks is a place to experiment with what this new way might look like.
Because we run a real publishing service with real authors, we can try new approaches and learn from what happens.
We are particularly interested in questions like:

- How do we know if research is being used?
- What does impact look like beyond citations?
- How can publishing better reflect the modular, interconnected nature of scientific work?

We'll share what we learn from these experiments, including the ones that don't work.
We'll also design Raven so that others can run their own experiments and share their learnings if they wish.

We hope The Stacks shows one way that we _could_ share knowledge more freely and effectively, and that others find it worth learning from.
We'll share whatever we learn freely and under permissive licenses, as we do with everything at Astera.
We're excited to see where the road takes us, and we hope you'll follow along.

## FAQ

### Can I publish on The Stacks?

Not yet.
The Stacks isn't open to external submissions.
It hosts work produced by the Astera Institute (which owns and operates the platform), as well as parent, sister, and affiliated organizations.

:::{tip} Interested in becoming an affiliate?
[Let us know](https://forms.gle/trozK1JUNf2hn9uF9), and we'll note your interest as we expand.
:::

### Are publications on The Stacks citable?

Yes.
All publications have a digital object identifier (DOI), and are indexed in Google Scholar and OpenAlex.

### Do you still think that peer review is useful?

Sure!
We just don't think it's a good mechanism for _gatekeeping_ whether something is publicly available.
We think review should _add information for the public record._
Comments, critiques, and discussion of ideas should be available for anyone to learn from and engage with.
For this reason, The Stacks first makes the information public, structured, and full of metadata.
And after publishing, it aims to offer ways to review, comment, discuss, etc.

### Could I use the feed from The Stacks as part of another product?

Yes!
The feed from The Stacks is [all permissively licensed as CC-BY or more permissive](https://astera.org/open-science-policy/), so you can do whatever you like within the bounds of that license.

### Really? Like what if I wanted to create a website called a-peer-reviewed-version-of-thestacks.com and made it a paid service?

Go for it!
Our goal is to see what kinds of things become possible when you make scientific content freely available and jam-packed with useful metadata.
We'll never gatekeep content on The Stacks, and that includes telling you what to do with it (within the restrictions of the content license, that is!)

That said, this is a choice that The Stacks makes.
Other Raven deployments may not be as permissive.

### What about _[other publishing product or service X]_? Why shouldn't people just use that?

They should, if they want to!
We believe in author empowerment, and we think it's healthy for this ecosystem to run many different experiments, companies, products, etc. that attempt to make scientific communication more effective.
This is a hard problem, and we celebrate anyone's effort to take a stab at it.
We'll do what we can to re-use and leverage shared technologies where appropriate, though our focus is building the best possible product and generating as much information as possible for The Stacks.

### Who develops and controls The Stacks and Raven?

The Stacks is developed by Astera, and primarily designed to serve authors within Astera, Arcadia, and their affiliated organizations.
It is largely driven by their needs.

Raven is developed by Astera, and designed for a larger collection of _deployer_ organizations and teams.
The Stacks is just one such deployment, and we try not to give it too much special treatment.

In the short term, the team will largely prioritize the needs of Astera's affiliated organizations, and a few partner groups deploying their own version of Raven.
In the longer term, we'll explore more ways to open up participation and collaboration in the project.

### Is The Stacks or Raven open source?

Yes!
The code for [Raven](https://github.com/Astera-org/raven) and [The Stacks](https://github.com/Astera-org/thestacks) is openly licensed under the BSD 3-Clause license.
You should do whatever you like with it.

### Can I join The Stacks or Raven projects like an open source project?

Not yet.
Our development priorities, roadmap, etc. are currently being driven by our team's needs.
Our code is openly licensed, but we're not currently running it as a participatory open source project.
See [Raven's contributing guide](https://github.com/Astera-org/raven/blob/main/CONTRIBUTING.md) for how the project is run and how to report issues.

### What is the sustainability model for The Stacks?

Astera has committed to at least 10 years of funding to continue operating and maintaining The Stacks.
Our goal is to use this time to build the most impactful technology, and to generate the most useful information possible, to drive the industry forward.
Beyond this, we'll explore a few ways that the effort could continue both organizationally and from a sustainability perspective.
As we learn more, we promise to share updates with our community publicly!

### How do I get help?

If you run into technical issues or have questions about using The Stacks, reach the team at [support@thestacks.org](mailto:support@thestacks.org).
