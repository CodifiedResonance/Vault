// CH-002 — canonical text, carried over word for word from the live Vault.
// NOTE: on the live site the DEFINITIONS section repeats the PURPOSE text (a CMS
// paste error), so this Charter currently has no definitions. "Meaningful Civic
// Effect" is used throughout and is not yet defined. Add a "## Definitions"
// section below Purpose when the wording is settled.

export default {
  version: 'CH-002',
  slug: 'charter-for-algorithmic-presence-in-civic-life',
  title: 'Charter for Algorithmic Presence in Civic Life',
  summary: 'Conditions under which algorithmic systems may influence, rank, score, classify, recommend, or determine outcomes within civic life.',
  card: 'Defines the minimum civic, technical, ethical, and protective conditions required before algorithmic systems may be used to shape decisions, access, treatment, prioritisation, or scrutiny within civic life.',
  jurisdiction: 'Local',
  scope: 'Algorithmic systems affecting public-facing civic environments and services',
  domain: 'Algorithmic Governance / Civic Protection',
  plate: 'Algorithms',
  standing: 'Model charter for local adoption, ratification, and enforcement',
  status: 'Draft',
  tags: ['local', 'algorithms', 'protection'],
  body: `
## Preamble
Algorithmic systems are already present within civic life, whether seen or unseen. They rank, filter, score, classify, recommend, predict, and shape decisions across housing, education, health, benefits, safeguarding, transport, employment, policing, and public administration. Their presence is often obscured by software language, procurement layers, institutional routine, or the false assumption that technical mediation is neutral by default.

Where a system can meaningfully alter a person's access, treatment, scrutiny, movement, opportunity, or standing, it is already exercising civic force. That force may not operate without declaration, accountability, review, and refusal. Civic life may not be silently reorganised by systems the public cannot see, question, or meaningfully challenge.

This Charter establishes the principle that local communities, authorities, and institutions retain the right and responsibility to set conditions on algorithmic presence within civic life. It exists to protect dignity, fairness, legibility, due process, and human accountability at the point where computational judgment begins to shape lived reality.

This Charter governs a category in which invisibility is itself part of the harm. Because algorithmic systems often arrive through software layers, procurement chains, and routine administrative use, the conditions set here are weighted toward declaration, legibility, contestability, and review rather than physical containment alone.

## Purpose
The purpose of this Charter is to define the minimum conditions required before an algorithmic system may be lawfully, ethically, and operationally used within local civic environments.

It is designed to:

- protect the public from preventable harm, hidden discrimination, procedural opacity, and unaccountable machine judgment
- establish local authority over algorithmic systems used within civic settings and public-facing services
- ensure that every material system has a named human line of responsibility
- distinguish assistive analysis from consequential decision influence
- create a practical standard for approval, suspension, review, and refusal
- preserve the principle that civic life is governed by stewardship, not technical inevitability

## Standing and Point of Effect
This Charter applies at the point of civic effect. Procurement origin, vendor location, model origin, or central contracting arrangement do not displace local standing. Where a system produces or is capable of producing Meaningful Civic Effect within the jurisdiction, the deploying body within that jurisdiction is the accountable party and must either secure compliance with this Charter or refuse deployment.

## Conditions of Deployment and Use
No algorithmic system may be deployed or used within the jurisdiction unless all of the following conditions are met.

1. Declared purpose | The deployer must clearly declare the function of the system, the civic process in which it will be used, the specific problem it claims to address, and the reason algorithmic mediation is necessary rather than merely convenient.

2. Named accountability | Every deployment must have a named human steward and a named responsible organisation. Responsibility may not be diffused across vendors, procurement chains, consultants, software providers, or abstract institutional ownership structures.

3. Local registration | The system must be registered with the relevant local authority before use begins. Registration must include system type, operating context, named steward, vendor or internal builder, declared decision boundary, decision posture, update pathway, affected populations, and escalation procedures.

4. Impact assessment | A deployment-specific assessment must be completed before approval. This assessment must address purpose, proportionality, fairness risk, data quality risk, discrimination risk, error pathways, explanation standards, challenge pathways, human review design, update risk, and likely effects on vulnerable populations.

5. Declared decision boundary | The deployer must declare what the system can and cannot do, what data it uses, what outputs it produces, what decisions it influences, and what forms of adaptation, retraining, or learning may occur. No meaningful civic use may rest on an undeclared system boundary.

6. Human review and override | Where a system has a Meaningful Civic Effect, a real human review and override pathway must exist. The human reviewer must be competent, reachable, authorised to intervene, and not reduced to a ceremonial rubber stamp.

7. Notice, explanation, and civic clarity | Where a person is materially affected by an algorithmic system, the deployer must provide clear notice that such a system is in use, the general function it serves, the nature of its influence on the outcome, and the route by which a person may seek explanation, review, or challenge. Explanation must be meaningful enough to support contestability. Mere disclosure that an automated system was used is insufficient.

8. Logging, traceability, and model lineage | The system must maintain sufficient records to reconstruct its use, inputs, outputs, interventions, model or rules version, and any material changes affecting outcomes. Model lineage must be preserved in a form sufficient for local audit, incident reconstruction, and public accountability where required.

9. Data limitation | Data used or generated through deployment must not be used beyond the declared civic purpose, operational audit, incident reconstruction, and lawful review unless separately and explicitly approved. Secondary commercial, profiling, training, or analytics use requires distinct approval.

10. Challenge and redress | A simple and accessible route must exist for people to challenge materially consequential outputs, request review, and seek correction where harm, error, or unfair treatment may have occurred.

11. Proportionality | The system must not impose a level of surveillance, opacity, categorisation, or procedural burden disproportionate to the civic purpose claimed. Greater civic consequence requires greater clarity, tighter boundaries, and stronger review.

12. Declared decision posture | The deployer must explicitly declare whether the system is assistive, advisory, prioritising, threshold-setting, or outcome-determinative. A system approved for one posture may not be used in another without renewed approval.

13. Declared review date and re-approval interval | Every consequential deployment must carry a declared review date, after which continued operation requires renewed approval. Continued civic use may not be presumed indefinite.

## Protective Constraints
The following constraints apply to all deployments under this Charter.

1. Human dignity and due process first | Human dignity, fairness, and procedural clarity take precedence over administrative speed, efficiency claims, model confidence, or institutional convenience.

2. No sole-system determination in high-risk contexts | No person may be denied, downgraded, sanctioned, escalated, flagged, or deprioritised in a high-risk civic context solely on the basis of an algorithmic output.

3. No invisible machine judgment | Where a system meaningfully shapes a civic outcome, its role may not remain hidden from those materially affected by it.

4. No undeclared data fusion | A deployer may not combine datasets, proxy variables, behavioural traces, third-party data, or inferential layers beyond what has been locally declared and approved.

5. No undeclared capability escalation | A system may not expand its predictive, inferential, adaptive, classificatory, or decision-shaping capabilities beyond what has been locally declared and approved.

6. No undeclared in-session adaptation | A system may not alter its outputs, thresholds, classifications, or recommendations within a live civic interaction based on a person's responses, behaviour, or inferred state unless such adaptation has been explicitly declared, bounded, and locally approved. Adaptive behaviour within a session is a declared capability, not a background feature.

7. No discriminatory proxying | A system may not rely on proxies, correlations, or hidden variables that produce materially discriminatory effects on protected or vulnerable groups, whether directly intended or operationally tolerated.

8. No silent retraining or material update drift | No significant update to model behaviour, rules logic, input structure, thresholding, or decision weight may be introduced without review where such change could materially alter civic outcomes.

9. No appeal to secrecy as a shield | Commercial confidentiality, vendor secrecy, or technical complexity may not be used to block local scrutiny, civic challenge, or audit of a system with Meaningful Civic Effect.

10. No manipulative steering | An algorithmic system may not be used to pressure, behaviourally steer, exploit confusion, or engineer compliance in ways that bypass ordinary civic consent and understanding.

11. No normalisation through quiet embedding | Pilot use, advisory use, or administrative support use may not be gradually normalised into consequential decision power without explicit renewed approval.

12. No relational masking | An algorithmic system used in civic life may not present itself in ways that obscure the location of institutional authority, simulate human accountability where none exists, or induce a person to treat system outputs as if they were relational care, legal judgment, or civic deliberation.

## Heightened Categories
The following categories require heightened review, explicit declaration, and independent justification before any civic use may be considered. Some may be unsuitable for local approval in principle.

1. Affect, character, trustworthiness, or intent inference | No system may infer or operationalise emotional state, intent, trustworthiness, future compliance, or character traits in a civic context unless such use has been explicitly declared, independently justified, and locally approved under heightened review.

## Refusal Conditions
A deployment must be refused, suspended, or withdrawn where any of the following apply:

- no named human steward exists
- the deployer cannot clearly state the system's purpose, scope, decision posture, or decision boundary
- Meaningful Civic Effects are being produced without real human review
- affected people are not given a route to challenge or seek review
- the deployer cannot provide a meaningful explanation of how the system's role shaped the outcome
- the distinction between advisory use and determinative use has collapsed in practice
- human reviewers systematically defer to the system without genuine scrutiny
- the system cannot produce adequate logs, model lineage, version traceability, or reconstruction capability
- the impact assessment is incomplete, misleading, or materially outdated
- the data used is excessive, poorly governed, inappropriately fused, or misaligned with the declared purpose
- the system demonstrates discriminatory patterns, persistent unexplained error, or harmful proxy effects
- the operating institution cannot explain who is responsible for intervention or withdrawal
- the deployer seeks to normalise trial conditions under the language of efficiency, modernisation, or service continuity
- the system's actual behaviour exceeds its declared decision boundary
- threshold changes, retraining history, or material update history cannot be adequately reconstructed
- local authority no longer has confidence in the system's proportionality, fairness, or governability

Refusal under this Charter does not require catastrophe. Repeated opacity, unexplained classifications, harmful error, undeclared escalation, rubber-stamp review, or procedural unfairness are sufficient grounds.

## Stewardship and Oversight
Algorithmic deployment within civic life must remain under visible, auditable human stewardship.

1. Local oversight | A designated local authority, committee, or review function shall retain the power to approve, constrain, suspend, or revoke deployment.

2. Registry of consequential systems | A local registry should be maintained for algorithmic systems with Meaningful Civic Effect. Registry entries should include the system name, deploying body, civic function, named steward, decision posture, declared decision boundary, and current standing.

3. Audit rights | Local oversight bodies must retain the right to inspect impact assessments, inputs, outputs, model or rules documentation, model lineage, version history, intervention records, challenge outcomes, and declared decision boundaries.

4. Incident reporting | Material errors, harmful false positives or negatives, discriminatory findings, unexplained escalations, and challenge failures must be reported promptly. Serious incidents should trigger automatic review.

5. Human review integrity | Where human review is required, the review process must itself be auditable. A human being placed in the loop without authority, time, institutional permission, relevant understanding, or practical capacity to depart from the system's output does not satisfy this Charter. Formal presence is not the same as meaningful review.

6. Non-waivable suspension power | No software agreement, procurement contract, vendor term, service dependency, or commercial arrangement may limit, delay, dilute, or supersede the local authority's power to suspend, withdraw, or refuse approval. Contractual continuity does not override civic safety or procedural fairness.

7. Withdrawal readiness | Any consequential algorithmic system must have a documented suspension, rollback, or withdrawal pathway that can be enacted without unreasonable delay. Civic dependency on a system does not eliminate the obligation to remove it where fairness, safety, legality, or governability has broken down.

8. Independent review where the local authority is deployer | Where the local authority, council, trust, force, or public body is also the deployer, the review and approval function must be operationally independent of the deploying department. Self-certification does not satisfy this Charter.

## Closing Standing
This Charter affirms a simple principle: no algorithmic system has an automatic right to shape civic life.

Presence must be earned through clarity, accountability, proportionality, reviewability, and declared restraint. Local communities bear the consequences of invisible machine judgment first; they therefore retain the right to set the terms first.

Where conditions are not met, deployment does not proceed.
Where accountability fails, deployment is paused.
Where a person's civic reality is being shaped by a system they cannot see, question, or meaningfully challenge, deployment is refused.

The burden of demonstration rests with the deployer. Necessity, legibility, contestability, governability, declared bounds, and meaningful human accountability must be shown, not assumed.

## Implementation Notes
This Charter is designed for real institutional conditions, not hypothetical future systems. It applies to statistical scoring systems, machine learning models, rules engines, risk triage systems, LLM-backed civic interfaces, and hybrid decision architectures already entering civic processes through procurement, vendor tools, and administrative software layers.

Where robotic presence produces visible civic force, algorithmic presence often produces hidden civic force. This is why the Charter places greater weight on declaration, explanation, challenge, auditability, and independent review. Invisibility is not a neutral condition. In this category, invisibility is often part of the harm.

## Local Commentary
This Charter governs a category in which software language, vendor abstraction, and institutional habit can conceal the true location of power. That concealment must not be mistaken for neutrality.

Algorithmic systems are not merely administrative tools once they begin shaping people's treatment, scrutiny, access, priority, or standing. They become civic actors in effect, whether or not anyone is willing to name them that way.

This is why local standing matters. The point of effect is the point of responsibility. The system may be bought centrally, built elsewhere, hosted remotely, or updated through opaque procurement chains; none of that removes the obligation of the body choosing to use it within civic life.
`,
};
