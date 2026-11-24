/**
 * PM QUEST - Client Knowledge Areas & Final Challenge Data
 * Exactly matches the PMBOK knowledge areas, definitions, processes, reminders and questions.
 */

window.KNOWLEDGE_AREAS = [
  {
    id: 1,
    title: "Project Integration Management",
    roleTitle: "Master Integrator",
    avatarIcon: "🧩",
    characterName: "Commander Alex",
    tagline: "The glue that unites the entire project",
    definition: "The overarching glue that coordinates, balances, and unites all project elements, stakeholders, and competing goals throughout the entire project lifecycle.",
    processes: [
      {
        number: 1,
        name: "Develop Project Charter",
        description: "The foundational document signed by the sponsor that formally authorizes the project and grants the PM authority to use organizational resources."
      },
      {
        number: 2,
        name: "Direct & Manage Work",
        description: "Leading the project team to execute planned activities and generate approved project deliverables."
      },
      {
        number: 3,
        name: "Perform Integrated Change Control",
        description: "Reviewing all change requests, approving changes via the Change Control Board (CCB), and updating project baselines."
      },
      {
        number: 4,
        name: "Close Project or Phase",
        description: "Finalizing all activities, handing over deliverables, archiving project records, and capturing lessons learned."
      }
    ],
    keyReminder: "No project changes occur without formal Change Control! If a stakeholder asks for a \"small favor\", it MUST be evaluated for impact on the Triple Constraint (Scope, Time, Cost) and submitted to the CCB.",
    quiz: {
      question: "Which document formally authorizes the project and gives the Project Manager authority to apply organizational resources?",
      options: [
        "A. Project Scope Statement",
        "B. Project Charter",
        "C. Work Breakdown Structure (WBS)",
        "D. Business Case"
      ],
      correctIndex: 1,
      correctLetter: "B",
      explanation: "The Project Charter is the foundational document signed by the sponsor that formally authorizes the project and grants the PM authority to use organizational resources."
    }
  },
  {
    id: 2,
    title: "Project Scope Management",
    roleTitle: "Scope Guardian",
    avatarIcon: "🛡️",
    characterName: "Sentinel Sarah",
    tagline: "Defining boundaries and guarding against scope creep",
    definition: "Defining, validating, and controlling everything that is included—and just as crucially, what is EXCLUDED—to ensure the project produces only the agreed work.",
    processes: [
      {
        number: 1,
        name: "Collect Requirements",
        description: "Documenting stakeholder needs, expectations, and acceptance criteria through interviews, focus groups, and prototypes."
      },
      {
        number: 2,
        name: "Define Scope",
        description: "Developing a detailed description of the project and product boundaries in the formal Project Scope Statement."
      },
      {
        number: 3,
        name: "Create WBS (Work Breakdown Structure)",
        description: "Decomposing total project scope into smaller, more manageable deliverables down to the lowest level: Work Packages."
      },
      {
        number: 4,
        name: "Validate & Control Scope",
        description: "Formalizing customer acceptance of completed deliverables and proactively guarding against Scope Creep."
      }
    ],
    keyReminder: "Scope Creep is the silent project killer! Furthermore, Gold Plating (giving the client unapproved free extras) is bad project management because it burns budget and creates hidden risks.",
    quiz: {
      question: "Which technique is used to break down project deliverables into smaller, more manageable components?",
      options: [
        "A. Critical Path Method",
        "B. Work Breakdown Structure (WBS)",
        "C. Resource Leveling",
        "D. Variance Analysis"
      ],
      correctIndex: 1,
      correctLetter: "B",
      explanation: "The Work Breakdown Structure (WBS) decomposes total project deliverables down to the smallest manageable units known as Work Packages."
    }
  },
  {
    id: 3,
    title: "Project Schedule Management",
    roleTitle: "Time Lord",
    avatarIcon: "⏳",
    characterName: "Chronos Kai",
    tagline: "Mastering the timeline and critical path",
    definition: "Planning, sequencing, estimating, developing, and controlling project timelines to guarantee timely completion of all deliverables.",
    processes: [
      {
        number: 1,
        name: "Define & Sequence Activities",
        description: "Identifying specific actions to be performed and determining logical dependencies using precedence diagrams (FS, FF, SS, SF)."
      },
      {
        number: 2,
        name: "Estimate Durations",
        description: "Calculating the amount of time needed for each activity using Three-Point Estimating (PERT: (O + 4M + P)/6) or Analogous estimation."
      },
      {
        number: 3,
        name: "Develop Schedule (CPM)",
        description: "Determining start and finish dates and finding the Critical Path—the longest path of dependent activities."
      },
      {
        number: 4,
        name: "Schedule Compression",
        description: "Accelerating the timeline using Crashing (adding resources, higher cost) or Fast-Tracking (doing sequential tasks in parallel, higher risk)."
      }
    ],
    keyReminder: "The Critical Path has ZERO Total Float (slack)! Any single delay on an activity along the critical path immediately delays the final project delivery date!",
    quiz: {
      question: "Your project is 2 weeks late. To catch up without increasing budget, you decide to begin software coding while system design is still finishing. What technique is this?",
      options: [
        "A. Crashing",
        "B. Fast-Tracking",
        "C. Resource Leveling",
        "D. Scope Reduction"
      ],
      correctIndex: 1,
      correctLetter: "B",
      explanation: "Fast-Tracking compresses schedule by performing activities in parallel that were originally planned in sequence, without increasing budget (unlike Crashing, which adds resources and budget cost)."
    }
  },
  {
    id: 4,
    title: "Project Cost Management",
    roleTitle: "Budget Master",
    avatarIcon: "💰",
    characterName: "Treasurer Leo",
    tagline: "Tracking every dollar with Earned Value analysis",
    definition: "Planning, estimating, budgeting, financing, and controlling costs so that the project can be completed within the approved budget baseline.",
    processes: [
      {
        number: 1,
        name: "Estimate Costs",
        description: "Developing monetary approximations for resources, labor, materials, and contingency reserves."
      },
      {
        number: 2,
        name: "Determine Budget",
        description: "Aggregating estimated costs to establish an authorized Cost Baseline, plus Management Reserves for unknown risks."
      },
      {
        number: 3,
        name: "Earned Value Management (EVM)",
        description: "Measuring project performance using EV (Earned Value), PV (Planned Value), and AC (Actual Cost)."
      },
      {
        number: 4,
        name: "Control Costs",
        description: "Monitoring variances (CV = EV - AC, SV = EV - PV) and cost efficiency indexes (CPI = EV / AC)."
      }
    ],
    keyReminder: "CPI below 1.0 = Over budget.\nSPI below 1.0 = Behind schedule.\nCPI equal to 1.0 = On budget.",
    quiz: {
      question: "In Earned Value Management (EVM), if your Cost Performance Index (CPI) is 0.80, what does this indicate?",
      options: [
        "A. The project is 20% ahead of schedule",
        "B. The project is under budget",
        "C. The project is over budget, getting only $0.80 value for every $1.00 spent",
        "D. The project has 80% remaining contingency reserves"
      ],
      correctIndex: 2,
      correctLetter: "C",
      explanation: "CPI = EV / AC. A CPI of 0.80 means for every $1.00 spent, the project only yields $0.80 of earned value, meaning it is significantly over budget."
    }
  },
  {
    id: 5,
    title: "Project Quality Management",
    roleTitle: "Quality Champion",
    avatarIcon: "🏅",
    characterName: "Inspector Maya",
    tagline: "Prevention over inspection, building excellence from day one",
    definition: "Incorporating the organization's quality policy regarding planning, managing, and controlling project and product quality requirements to satisfy stakeholder objectives.",
    processes: [
      {
        number: 1,
        name: "Plan Quality Management",
        description: "Identifying quality requirements and standards for deliverables, defining quality metrics, and benchmarking."
      },
      {
        number: 2,
        name: "Manage Quality (QA)",
        description: "Executing quality audits and process improvements to build confidence that future outputs will meet specifications."
      },
      {
        number: 3,
        name: "Control Quality (QC)",
        description: "Monitoring, measuring, and inspecting specific deliverable results to determine if they adhere to quality criteria."
      },
      {
        number: 4,
        name: "Cost of Quality (COQ)",
        description: "Balancing Cost of Conformance (prevention, appraisal) against Cost of Nonconformance (rework, scrap, warranty claims)."
      }
    ],
    keyReminder: "Prevention over Inspection! Quality must be planned, designed, and built into the deliverable from day one. Preventing defects during execution is vastly cheaper than fixing defects after delivery.",
    quiz: {
      question: "A project manager discovers defects during the inspection of a finished deliverable and measures whether it meets the required specifications. This is:",
      options: [
        "A. Quality Planning",
        "B. Quality Assurance",
        "C. Quality Control",
        "D. Cost of Prevention"
      ],
      correctIndex: 2,
      correctLetter: "C",
      explanation: "Quality Control (QC) is concerned with inspecting deliverables to find defects and measuring whether they meet specifications, whereas QA focuses on processes."
    }
  },
  {
    id: 6,
    title: "Project Resource Management",
    roleTitle: "Team Architect",
    avatarIcon: "👥",
    characterName: "Captain Marcus",
    tagline: "Empowering people and optimizing critical resources",
    definition: "Identifying, acquiring, organizing, leading, and managing the human team members, equipment, materials, and facilities necessary for successful project delivery.",
    processes: [
      {
        number: 1,
        name: "Plan Resource Management",
        description: "Defining how to estimate, acquire, manage, and use physical and team resources, establishing the RACI Matrix."
      },
      {
        number: 2,
        name: "Acquire Resources",
        description: "Securing team members, facilities, equipment, and materials from internal departments or external vendors."
      },
      {
        number: 3,
        name: "Develop Team (Tuckman)",
        description: "Guiding the team through the stages: Forming → Storming → Norming → Performing → Adjourning."
      },
      {
        number: 4,
        name: "Manage Team & Conflict",
        description: "Tracking performance, providing feedback, and resolving conflicts (Collaborate/Problem-Solve is ideal)."
      }
    ],
    keyReminder: "In a RACI Matrix (Responsible, Accountable, Consulted, Informed), only ONE individual should be Accountable (A) for each deliverable to avoid confusion and finger-pointing!",
    quiz: {
      question: "In a RACI responsibility assignment chart, how many people should ideally be assigned as 'Accountable' (A) for any single task?",
      options: [
        "A. Two co-leads",
        "B. Exactly one person",
        "C. The entire team",
        "D. As many people as have time"
      ],
      correctIndex: 1,
      correctLetter: "B",
      explanation: "To avoid confusion, diffusion of responsibility, and finger-pointing, only exactly ONE person must be Accountable (A) for any given activity."
    }
  },
  {
    id: 7,
    title: "Project Communications Management",
    roleTitle: "Master Communicator",
    avatarIcon: "📡",
    characterName: "Herald Zoe",
    tagline: "Transmitting the right message to the right people at the right time",
    definition: "Ensuring timely and appropriate planning, collection, creation, distribution, storage, retrieval, management, monitoring, and ultimate disposition of project information.",
    processes: [
      {
        number: 1,
        name: "Plan Communications",
        description: "Determining stakeholder information needs, preferred media formats, frequency, language, and communication channels."
      },
      {
        number: 2,
        name: "Manage Communications",
        description: "Creating, gathering, and transmitting project reports, updates, and presentations according to the plan."
      },
      {
        number: 3,
        name: "Communication Methods",
        description: "Interactive (meetings, phone calls), Push (emails, press releases, memos), and Pull (intranet portals, shared drives)."
      },
      {
        number: 4,
        name: "Monitor Communications",
        description: "Verifying that the optimal flow of information is being delivered to the right stakeholders at the right time."
      }
    ],
    keyReminder: "Communication Channels Formula:\n\nC = N(N - 1) / 2\nWhere N is the number of team members.\nAs team size grows, the number of potential communication pathways increases significantly.",
    quiz: {
      question: "Uploading project dashboards and technical wikis to a cloud repository where team members access them on demand is an example of:",
      options: [
        "A. Push communication",
        "B. Pull communication",
        "C. Interactive communication",
        "D. Multicast transmission"
      ],
      correctIndex: 1,
      correctLetter: "B",
      explanation: "Pull communication provides information in a repository where stakeholders retrieve it at their own discretion and convenience."
    }
  },
  {
    id: 8,
    title: "Project Risk Management",
    roleTitle: "Risk Strategist",
    avatarIcon: "🎲",
    characterName: "Tactician Raven",
    tagline: "Anticipating threats and seizing unexpected opportunities",
    definition: "Conducting risk management planning, identification, analysis, response planning, response implementation, and monitoring risk on a project.",
    processes: [
      {
        number: 1,
        name: "Identify Risks",
        description: "Detecting individual project risks and sources of overall risk, compiling them into the living Risk Register."
      },
      {
        number: 2,
        name: "Qualitative Risk Analysis",
        description: "Prioritizing individual project risks by assessing their Probability of occurrence and potential Impact (P × I Matrix)."
      },
      {
        number: 3,
        name: "Plan Risk Responses (Threats)",
        description: "Strategies for negative risks: Avoid (eliminate), Mitigate (reduce probability/impact), Transfer (shift to third party), Accept."
      },
      {
        number: 4,
        name: "Plan Risk Responses (Opportunities)",
        description: "Strategies for positive risks: Exploit (make it happen), Enhance (increase likelihood), Share (partner), Accept."
      }
    ],
    keyReminder: "Risks are not only threats—uncertain events can also be positive OPPORTUNITIES!\nAlso remember: Purchasing insurance or adding warranties is Risk TRANSFERENCE, not mitigation.",
    quiz: {
      question: "Purchasing an insurance policy or entering a fixed-price contract to shift financial liability to a third party is an example of:",
      options: [
        "A. Risk Avoidance",
        "B. Risk Mitigation",
        "C. Risk Transference",
        "D. Risk Acceptance"
      ],
      correctIndex: 2,
      correctLetter: "C",
      explanation: "Risk Transference shifts the financial consequences of a threat to a third party (such as buying insurance or using fixed-price contracts)."
    }
  },
  {
    id: 9,
    title: "Project Procurement Management",
    roleTitle: "Procurement Titan",
    avatarIcon: "💼",
    characterName: "Baron Sterling",
    tagline: "Contract mastery, vendor negotiations, and risk allocation",
    definition: "Purchasing or acquiring products, services, or results needed from outside the project team, establishing contracts, and managing external vendor relations.",
    processes: [
      {
        number: 1,
        name: "Plan Procurement",
        description: "Conducting Make-or-Buy analysis, creating Procurement Statements of Work (SOW), and selecting contract types."
      },
      {
        number: 2,
        name: "Conduct Procurements",
        description: "Issuing RFPs/RFQs, hosting Bidder Conferences to ensure vendor fairness, evaluating bids, and awarding contracts."
      },
      {
        number: 3,
        name: "Contract Types & Risk",
        description: "Fixed Price (FFP: seller bears risk), Cost-Reimbursable (CP: buyer bears risk), Time and Materials (T&M: hybrid)."
      },
      {
        number: 4,
        name: "Control Procurements",
        description: "Administering contracts, inspecting supplier deliverables, verifying invoices, and formal contract closeout."
      }
    ],
    keyReminder: "Contract Type dictates risk distribution!\nFirm Fixed Price (FFP): Seller carries maximum financial risk.\nCost-Plus: Buyer carries maximum financial risk.",
    quiz: {
      question: "Which contract type places the GREATEST financial risk on the BUYER if costs escalate or work takes longer than planned?",
      options: [
        "A. Firm Fixed Price (FFP)",
        "B. Fixed Price with Incentive Fee (FPIF)",
        "C. Cost-Reimbursable (Cost-Plus)",
        "D. Lump-Sum Purchase Order"
      ],
      correctIndex: 2,
      correctLetter: "C",
      explanation: "In Cost-Reimbursable (Cost-Plus) contracts, the buyer reimburses all legitimate seller costs plus a fee, placing maximum financial risk on the buyer."
    }
  }
];

window.FINAL_CHALLENGE = {
  title: "FINAL MISSION: The CyberPulse Launch Crisis",
  subtitle: "Cross-Knowledge Area Scenario Challenge",
  scenario: `Two weeks before the launch of the smart hospital telemetry system, the primary cloud integration vendor informs you that their secure telemetry module will be delayed by 3 weeks unless you approve an emergency $25,000 overtime surge charge.

Meanwhile, during the executive demo, the Chief Medical Officer demands an unapproved AI predictive analytics dashboard be added before signing off on deployment.

As the Senior Project Manager, you take decisive action:
1. You reject the immediate addition of the AI dashboard, reminding the executive that all new features require a formal Change Request and CCB approval to protect the project baseline.
2. You review the vendor contract terms, invoke contract delay penalty clauses, and analyze the $25,000 cost surge against your Management and Contingency Reserves.
3. You instruct your team to begin software integration testing in parallel with mock telemetry data (Fast-Tracking) so the timeline stays on track.
4. You log this emerging threat into the Risk Register, update the Probability × Impact matrix, and schedule an emergency alignment meeting with key hospital stakeholders.`,
  question: "Select ALL the Project Management Knowledge Areas that were actively applied in resolving this crisis:",
  options: [
    { id: 1, text: "Project Integration Management (Change Control & CCB review)", correct: true },
    { id: 2, text: "Project Scope Management (Defending baseline against Scope Creep)", correct: true },
    { id: 3, text: "Project Schedule Management (Fast-tracking testing to mitigate delays)", correct: true },
    { id: 4, text: "Project Cost Management (Assessing the $25,000 surge vs. reserves)", correct: true },
    { id: 7, text: "Project Communications Management (Emergency alignment meeting with stakeholders)", correct: true },
    { id: 8, text: "Project Risk Management (Updating Risk Register & P×I matrix)", correct: true },
    { id: 9, text: "Project Procurement Management (Reviewing vendor contract & penalty clauses)", correct: true }
  ],
  bonusPoints: 150,
  explanation: "Master Project Managers never work in silos! A single real-world crisis touches Integration (CCB), Scope (Creep prevention), Schedule (Fast-tracking), Cost (Reserves), Risk (Register updates), Communications (Stakeholder alignment), and Procurement (Vendor contracts)."
};
