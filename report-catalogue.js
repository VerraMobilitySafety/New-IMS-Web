/* Generated bootstrap from API report_catalogue.json; live plans refresh it. */
window.VeroReportingCatalogue={
  "version": 2,
  "sources": {
    "risks": {
      "name": "Risks",
      "path": "/risks?assessment_coverage=true",
      "key": "risks",
      "page": "risk.html",
      "title": "risk_title",
      "code": "risk_code",
      "owner": "risk_owner",
      "type": "risk_type",
      "date": "next_review_date",
      "dateLabel": "review date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "risk_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "risk_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "risk_owner",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "risk_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "next_review_date",
          "type": "date",
          "label": "Date"
        },
        "risk_category": {
          "path": "risk_category",
          "type": "text",
          "label": "Risk Category"
        },
        "register_name": {
          "path": "register_name",
          "type": "text",
          "label": "Register Name"
        },
        "register_type": {
          "path": "register_type",
          "type": "text",
          "label": "Register Type"
        },
        "treatment_strategy": {
          "path": "treatment_strategy",
          "type": "text",
          "label": "Treatment Strategy"
        },
        "assessment_state": {
          "path": "assessment_state",
          "type": "text",
          "label": "Assessment State"
        },
        "assessment_basis": {
          "path": "assessment_basis",
          "type": "text",
          "label": "Assessment Basis"
        },
        "applicable_contexts": {
          "path": "applicable_contexts",
          "type": "number",
          "label": "Accessible Applicable Contexts"
        },
        "approved_contexts": {
          "path": "approved_contexts",
          "type": "number",
          "label": "Approved Operational Assessments"
        },
        "awaiting_assessment": {
          "path": "awaiting_assessment",
          "type": "number",
          "label": "Contexts Awaiting Approved Assessment"
        }
      },
      "notice": "Assessment state is Assessed when a valid recorded master residual position or approved operational residual position exists; otherwise Not Assessed within accessible scope. Draft/submitted operational assessments do not count as approved. Recorded master positions are not proof of operational approval. awaiting_assessment counts accessible applicable contexts without approved assessments; an assessed master may still have context gaps. Lifecycle status is separate. No inaccessible context is included."
    },
    "projects": {
      "name": "Projects",
      "path": "/projects",
      "key": "projects",
      "page": "project-management.html",
      "title": "project_name",
      "code": "project_code",
      "owner": "project_owner",
      "type": "project_type",
      "date": "target_end_date",
      "dateLabel": "target end date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "project_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "project_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "project_owner",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "project_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "target_end_date",
          "type": "date",
          "label": "Date"
        },
        "project_type": {
          "path": "project_type",
          "type": "text",
          "label": "Project Type"
        },
        "start_date": {
          "path": "start_date",
          "type": "date",
          "label": "Start Date"
        },
        "target_end_date": {
          "path": "target_end_date",
          "type": "date",
          "label": "Target End Date"
        },
        "current_stage": {
          "path": "current_stage",
          "type": "text",
          "label": "Current Stage"
        },
        "customer": {
          "path": "customer",
          "type": "text",
          "label": "Customer"
        },
        "project_initiator": {
          "path": "project_initiator",
          "type": "text",
          "label": "Project Initiator"
        },
        "action_required_by": {
          "path": "action_required_by",
          "type": "text",
          "label": "Action Required By"
        }
      }
    },
    "investigations": {
      "name": "Investigations",
      "path": "/incidents?reporting=monthly",
      "key": "events",
      "page": "incident-management.html?view=register",
      "title": "title",
      "code": "event_code",
      "owner": "investigator_name",
      "type": "event_type",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "event_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "investigator_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "event_type",
          "type": "text",
          "label": "Type"
        },
        "site": {
          "path": "site",
          "type": "text",
          "label": "Verra Mobility Site"
        }
      },
      "limit": 500
    },
    "events": {
      "name": "Events",
      "path": "/incidents",
      "key": "events",
      "page": "incident-management.html?view=register",
      "title": "title",
      "code": "event_code",
      "owner": "investigator_name",
      "type": "event_type",
      "date": "occurred_date",
      "dateLabel": "occurrence date",
      "pastFlag": false,
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "event_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "investigator_name",
          "type": "text",
          "label": "Investigator"
        },
        "type": {
          "path": "event_type",
          "type": "text",
          "label": "Type"
        },
        "site": {
          "path": "site",
          "type": "text",
          "label": "Site"
        },
        "date": {
          "path": "occurred_date",
          "type": "date",
          "label": "Date"
        }
      },
      "limit": 500
    },
    "documents": {
      "name": "Documents",
      "path": "/documents",
      "key": "documents",
      "page": "documents.html",
      "title": "document_title",
      "code": "document_number",
      "owner": "document_owner_name",
      "ownerFallback": "document_owner",
      "type": "document_type",
      "date": "review_date",
      "dateLabel": "review date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "document_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "document_number",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "document_owner_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "document_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "review_date",
          "type": "date",
          "label": "Date"
        },
        "document_type": {
          "path": "document_type",
          "type": "text",
          "label": "Document Type"
        },
        "review_date": {
          "path": "review_date",
          "type": "date",
          "label": "Review Date"
        },
        "version": {
          "path": "version",
          "type": "text",
          "label": "Version"
        }
      }
    },
    "records": {
      "name": "Records",
      "path": "/records",
      "key": "records",
      "page": "records.html",
      "title": "record_title",
      "code": "record_code",
      "type": "record_type",
      "date": "retention.disposal_due_date",
      "dateLabel": "disposal due date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "record_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "record_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "record_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "retention.disposal_due_date",
          "type": "date",
          "label": "Date"
        },
        "record_type": {
          "path": "record_type",
          "type": "text",
          "label": "Record Type"
        },
        "security_classification": {
          "path": "security_classification",
          "type": "text",
          "label": "Security Classification"
        }
      }
    },
    "compliance": {
      "name": "Compliance obligations",
      "path": "/compliance/obligations",
      "key": "obligations",
      "page": "compliance.html",
      "title": "obligation_title",
      "code": "obligation_code",
      "owner": "owner_business_area",
      "type": "compliance_type",
      "date": "next_review_date",
      "dateLabel": "review date",
      "dedupe": true,
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "obligation_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "obligation_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_business_area",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "compliance_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "next_review_date",
          "type": "date",
          "label": "Date"
        },
        "jurisdiction": {
          "path": "jurisdiction",
          "type": "text",
          "label": "Jurisdiction"
        },
        "applicability": {
          "path": "applicability",
          "type": "text",
          "label": "Applicability"
        },
        "source_name": {
          "path": "source_name",
          "type": "text",
          "label": "Source Name"
        },
        "source_reference": {
          "path": "source_reference",
          "type": "text",
          "label": "Source Reference"
        },
        "effective_date": {
          "path": "effective_date",
          "type": "date",
          "label": "Effective Date"
        },
        "expiry_date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Expiry Date"
        },
        "next_assessment_date": {
          "path": "next_assessment_date",
          "type": "date",
          "label": "Next Assessment Date"
        },
        "obligation_frequency": {
          "path": "obligation_frequency",
          "type": "text",
          "label": "Obligation Frequency"
        },
        "open_action_count": {
          "path": "open_action_count",
          "type": "number",
          "label": "Open Action Count"
        }
      }
    },
    "insurance": {
      "name": "Insurance policies",
      "path": "/insurance/policies",
      "key": "policies",
      "page": "insurance.html",
      "title": "policy_name",
      "code": "policy_number",
      "owner": "owner_user_id",
      "type": "insurance_class",
      "country": "country_code",
      "date": "expiry_date",
      "dateLabel": "expiry date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "policy_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "policy_number",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_user_id",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "insurance_class",
          "type": "text",
          "label": "Type"
        },
        "country": {
          "path": "country_code",
          "type": "text",
          "label": "Country"
        },
        "date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Date"
        },
        "currency": {
          "path": "currency",
          "type": "text",
          "label": "Currency"
        },
        "insurer_name": {
          "path": "insurer_name",
          "type": "text",
          "label": "Insurer Name"
        },
        "insurance_class": {
          "path": "insurance_class",
          "type": "text",
          "label": "Insurance Class"
        },
        "policy_scope": {
          "path": "policy_scope",
          "type": "text",
          "label": "Policy Scope"
        },
        "inception_date": {
          "path": "inception_date",
          "type": "date",
          "label": "Inception Date"
        },
        "expiry_date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Expiry Date"
        },
        "broker_name": {
          "path": "broker_name",
          "type": "text",
          "label": "Broker Name"
        },
        "insured_entity_name": {
          "path": "insured_entity_name",
          "type": "text",
          "label": "Insured Entity Name"
        }
      }
    },
    "contractors": {
      "name": "Contractor companies",
      "path": "/contractors",
      "key": "data.contractors",
      "page": "contractor-management.html",
      "title": "company_name",
      "code": "contractor_code",
      "owner": "contract_owner",
      "type": "service_type",
      "country": "country",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "company_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "contractor_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "contract_owner",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "service_type",
          "type": "text",
          "label": "Type"
        },
        "country": {
          "path": "country",
          "type": "text",
          "label": "Country"
        },
        "risk_level": {
          "path": "risk_level",
          "type": "text",
          "label": "Risk Level"
        },
        "service_type": {
          "path": "service_type",
          "type": "text",
          "label": "Service Type"
        }
      }
    },
    "client-services": {
      "name": "Client services contracts",
      "path": "/maintenance-contracts",
      "key": "contracts",
      "page": "maintenance-management.html",
      "title": "contract_name",
      "code": "contract_code",
      "owner": "owner_name",
      "type": "customer_name",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "contract_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "contract_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "customer_name",
          "type": "text",
          "label": "Type"
        },
        "customer_name": {
          "path": "customer_name",
          "type": "text",
          "label": "Customer Name"
        },
        "contract_code": {
          "path": "contract_code",
          "type": "text",
          "label": "Contract Code"
        },
        "compliance_status": {
          "path": "compliance_status",
          "type": "text",
          "label": "Compliance Status"
        }
      }
    },
    "locations": {
      "name": "Verra Mobility locations",
      "path": "/risk/operational-contexts",
      "key": "vm_locations",
      "page": "sites.html",
      "title": "name",
      "code": "code",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "site": {
          "path": "name",
          "type": "text",
          "label": "Site"
        }
      }
    },
    "sites": {
      "name": "Operational sites",
      "path": "/risk/operational-contexts",
      "key": "sites",
      "page": "sites.html",
      "title": "name",
      "code": "code",
      "type": "kind",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "kind",
          "type": "text",
          "label": "Type"
        },
        "site": {
          "path": "name",
          "type": "text",
          "label": "Site"
        }
      }
    },
    "actions": {
      "name": "My Actions",
      "path": "/my-actions",
      "key": "actions",
      "page": "my-actions.html",
      "title": "title",
      "code": "id",
      "owner": "assigned_to_user_id",
      "type": "source",
      "date": "due_date",
      "dateLabel": "due date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "assigned_to_user_id",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "source",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "due_date",
          "type": "date",
          "label": "Date"
        }
      }
    },
    "assets": {
      "name": "Assets and Vehicles",
      "path": "/assets?limit=200",
      "key": "assets",
      "page": "asset-management.html",
      "title": "asset_name",
      "code": "asset_tag",
      "pagination": {
        "mode": "offset",
        "size": 200,
        "total": "total",
        "max": 10000
      },
      "owner": "owner_name",
      "type": "category",
      "date": "next_service_date",
      "dateLabel": "next service date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "asset_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "asset_tag",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "category",
          "type": "text",
          "label": "Type"
        },
        "site": {
          "path": "site_name",
          "type": "text",
          "label": "Site"
        },
        "date": {
          "path": "next_service_date",
          "type": "date",
          "label": "Date"
        },
        "manufacturer": {
          "path": "manufacturer",
          "type": "text",
          "label": "Manufacturer"
        },
        "model": {
          "path": "model",
          "type": "text",
          "label": "Model"
        },
        "condition": {
          "path": "condition",
          "type": "text",
          "label": "Condition"
        },
        "registration_number": {
          "path": "registration_number",
          "type": "text",
          "label": "Registration Number"
        },
        "location": {
          "path": "location",
          "type": "text",
          "label": "Location"
        },
        "purchase_date": {
          "path": "purchase_date",
          "type": "date",
          "label": "Purchase Date"
        },
        "warranty_expiry": {
          "path": "warranty_expiry",
          "type": "date",
          "label": "Warranty Expiry"
        },
        "last_service_date": {
          "path": "last_service_date",
          "type": "date",
          "label": "Last Service Date"
        },
        "next_service_date": {
          "path": "next_service_date",
          "type": "date",
          "label": "Next Service Date"
        },
        "site_name": {
          "path": "site_name",
          "type": "text",
          "label": "Site Name"
        },
        "asset_type": {
          "path": "asset_type",
          "type": "text",
          "label": "Asset Type"
        },
        "category": {
          "path": "category",
          "type": "text",
          "label": "Category"
        }
      }
    },
    "contractor-workers": {
      "name": "Contractor Workers",
      "path": "/contractors",
      "key": "data.workers",
      "page": "contractor-management.html",
      "title": "role_title",
      "code": "id",
      "relation": {
        "source": "contractors",
        "local": "contractor_id",
        "remote": "id",
        "fields": {
          "contractor": "company_name"
        }
      },
      "owner": "first_name",
      "type": "induction_status",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "role_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "first_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "induction_status",
          "type": "text",
          "label": "Type"
        },
        "induction_status": {
          "path": "induction_status",
          "type": "text",
          "label": "Induction Status"
        },
        "role_title": {
          "path": "role_title",
          "type": "text",
          "label": "Role Title"
        },
        "contractor": {
          "path": "contractor",
          "type": "text",
          "label": "Contractor"
        }
      }
    },
    "contractor-requirements": {
      "name": "Contractor Requirements",
      "path": "/contractors",
      "key": "data.requirements",
      "page": "contractor-management.html",
      "title": "requirement_type",
      "code": "reference",
      "statusPath": "compliance_status",
      "relation": {
        "source": "contractors",
        "local": "contractor_id",
        "remote": "id",
        "fields": {
          "contractor": "company_name"
        }
      },
      "type": "requirement_type",
      "date": "expiry_date",
      "dateLabel": "expiry date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "requirement_type",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "reference",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "compliance_status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "requirement_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Date"
        },
        "expiry_date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Expiry Date"
        },
        "compliance_status": {
          "path": "compliance_status",
          "type": "text",
          "label": "Compliance Status"
        },
        "contractor": {
          "path": "contractor",
          "type": "text",
          "label": "Contractor"
        }
      }
    },
    "contractor-monitoring": {
      "name": "Contractor Monitoring",
      "path": "/contractors",
      "key": "data.monitoring",
      "page": "contractor-management.html",
      "title": "monitoring_type",
      "code": "id",
      "statusPath": "outcome",
      "pastFlag": false,
      "relation": {
        "source": "contractors",
        "local": "contractor_id",
        "remote": "id",
        "fields": {
          "contractor": "company_name"
        }
      },
      "type": "monitoring_type",
      "date": "activity_date",
      "dateLabel": "activity date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "monitoring_type",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "outcome",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "monitoring_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "activity_date",
          "type": "date",
          "label": "Date"
        },
        "activity_date": {
          "path": "activity_date",
          "type": "date",
          "label": "Activity Date"
        },
        "outcome": {
          "path": "outcome",
          "type": "text",
          "label": "Outcome"
        },
        "contractor": {
          "path": "contractor",
          "type": "text",
          "label": "Contractor"
        }
      }
    },
    "contractor-contracts": {
      "name": "Contractor Contracts",
      "path": "/contractors",
      "key": "data.contracts",
      "page": "contractor-management.html",
      "title": "title",
      "code": "contract_number",
      "relation": {
        "source": "contractors",
        "local": "contractor_id",
        "remote": "id",
        "fields": {
          "contractor": "company_name"
        }
      },
      "date": "expiry_date",
      "dateLabel": "expiry date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "contract_number",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Date"
        },
        "effective_date": {
          "path": "effective_date",
          "type": "date",
          "label": "Effective Date"
        },
        "expiry_date": {
          "path": "expiry_date",
          "type": "date",
          "label": "Expiry Date"
        },
        "contractor": {
          "path": "contractor",
          "type": "text",
          "label": "Contractor"
        }
      }
    },
    "compliance-controls": {
      "name": "Compliance Controls",
      "path": "/compliance/controls",
      "key": "controls",
      "page": "compliance.html",
      "title": "control_title",
      "code": "control_code",
      "owner": "owner_name",
      "type": "control_type",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "control_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "control_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "control_type",
          "type": "text",
          "label": "Type"
        }
      }
    },
    "contract-requirements": {
      "name": "Client Contract Requirements",
      "path": "/compliance/contract-requirements",
      "key": "requirements",
      "page": "compliance-contract-register.html",
      "title": "common_requirement",
      "code": "obligation_code",
      "statusPath": "assessment_status",
      "identity": [
        "contract_id",
        "obligation_id",
        "activity"
      ],
      "type": "common_requirement",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "common_requirement",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "obligation_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "assessment_status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "common_requirement",
          "type": "text",
          "label": "Type"
        }
      }
    },
    "retention-rules": {
      "name": "Record Retention Rules",
      "path": "/records/retention-rules",
      "key": "rules",
      "page": "records.html",
      "title": "rule_name",
      "code": "rule_code",
      "type": "record_category",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "rule_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "rule_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "record_category",
          "type": "text",
          "label": "Type"
        },
        "retention_period_months": {
          "path": "retention_period_months",
          "type": "number",
          "label": "Retention Period Months"
        },
        "retention_trigger": {
          "path": "retention_trigger",
          "type": "text",
          "label": "Retention Trigger"
        },
        "record_type": {
          "path": "record_type",
          "type": "text",
          "label": "Record Type"
        },
        "business_area": {
          "path": "business_area",
          "type": "text",
          "label": "Business Area"
        },
        "authority": {
          "path": "authority",
          "type": "text",
          "label": "Authority"
        },
        "review_date": {
          "path": "review_date",
          "type": "date",
          "label": "Review Date"
        },
        "effective_date": {
          "path": "effective_date",
          "type": "date",
          "label": "Effective Date"
        },
        "record_count": {
          "path": "record_count",
          "type": "number",
          "label": "Record Count"
        }
      }
    },
    "record-holds": {
      "name": "Record Holds",
      "path": "/records/holds",
      "key": "holds",
      "page": "records.html",
      "title": "record_title",
      "code": "record_code",
      "type": "hold_type",
      "date": "review_date",
      "dateLabel": "review date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "record_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "record_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "hold_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "review_date",
          "type": "date",
          "label": "Date"
        },
        "hold_type": {
          "path": "hold_type",
          "type": "text",
          "label": "Hold Type"
        },
        "review_date": {
          "path": "review_date",
          "type": "date",
          "label": "Review Date"
        },
        "placed_at": {
          "path": "placed_at",
          "type": "date",
          "label": "Placed At"
        },
        "placed_by_name": {
          "path": "placed_by_name",
          "type": "text",
          "label": "Placed By Name"
        },
        "released_by_name": {
          "path": "released_by_name",
          "type": "text",
          "label": "Released By Name"
        },
        "released_at": {
          "path": "released_at",
          "type": "date",
          "label": "Released At"
        }
      }
    },
    "record-dispositions": {
      "name": "Record Dispositions",
      "path": "/records/dispositions",
      "key": "dispositions",
      "page": "records.html",
      "title": "record_title",
      "code": "record_code",
      "type": "disposition_type",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "record_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "record_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "disposition_type",
          "type": "text",
          "label": "Type"
        },
        "disposal_method": {
          "path": "disposal_method",
          "type": "text",
          "label": "Disposal Method"
        },
        "proposed_by_name": {
          "path": "proposed_by_name",
          "type": "text",
          "label": "Proposed By Name"
        },
        "approved_by_name": {
          "path": "approved_by_name",
          "type": "text",
          "label": "Approved By Name"
        },
        "completed_by_name": {
          "path": "completed_by_name",
          "type": "text",
          "label": "Completed By Name"
        },
        "proposed_at": {
          "path": "proposed_at",
          "type": "date",
          "label": "Proposed At"
        },
        "approved_at": {
          "path": "approved_at",
          "type": "date",
          "label": "Approved At"
        },
        "completed_at": {
          "path": "completed_at",
          "type": "date",
          "label": "Completed At"
        },
        "new_disposal_due_date": {
          "path": "new_disposal_due_date",
          "type": "date",
          "label": "New Disposal Due Date"
        },
        "extension_months": {
          "path": "extension_months",
          "type": "number",
          "label": "Extension Months"
        }
      }
    },
    "injury-register": {
      "name": "Injury Register (Aggregate Metadata)",
      "path": "/injury-register",
      "key": "records",
      "page": "injury-register.html",
      "title": "fields.Injury Classification",
      "code": "id",
      "statusPath": "fields.Claim Status",
      "pastFlag": false,
      "aggregateOnly": true,
      "notice": "Restricted injury metadata only. No injured-person names, claim identifiers, descriptions, or medical details enter report evidence. Access is enforced by the injury register.",
      "type": "fields.Injury Classification",
      "date": "fields.Date of Injury",
      "dateLabel": "fields.Date of Injury",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "fields.Injury Classification",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "fields.Claim Status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "fields.Injury Classification",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "fields.Date of Injury",
          "type": "date",
          "label": "Date"
        }
      }
    },
    "all-actions": {
      "name": "Accessible Action Records",
      "path": "/reports/action-owners",
      "key": "actions",
      "page": "my-actions.html",
      "title": "title",
      "code": "id",
      "notice": "Accessible open action records across the sources covered by the Action Owners reader; excludes investigations and workflow queues. Overdue is the reader\u2019s recorded overdue flag, not an inference from an arbitrary date.",
      "owner": "owner_name",
      "type": "source",
      "date": "due_date",
      "dateLabel": "due date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "owner": {
          "path": "owner_name",
          "type": "text",
          "label": "Owner"
        },
        "type": {
          "path": "source",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "due_date",
          "type": "date",
          "label": "Date"
        },
        "source": {
          "path": "source",
          "type": "text",
          "label": "Source"
        },
        "due_date": {
          "path": "due_date",
          "type": "date",
          "label": "Due Date"
        },
        "overdue": {
          "path": "overdue",
          "type": "boolean",
          "label": "Overdue"
        }
      }
    },
    "project-milestones": {
      "name": "Project Milestones",
      "path": "/projects/{id}/milestones",
      "key": "milestones",
      "page": "project-management.html",
      "title": "milestone_name",
      "code": "id",
      "parent": "projects",
      "date": "target_date",
      "dateLabel": "target date",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "milestone_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "date": {
          "path": "target_date",
          "type": "date",
          "label": "Date"
        },
        "project": {
          "path": "project",
          "type": "text",
          "label": "Project"
        },
        "milestone_type": {
          "path": "milestone_type",
          "type": "text",
          "label": "Milestone Type"
        },
        "completed_date": {
          "path": "completed_date",
          "type": "date",
          "label": "Completed Date"
        },
        "target_date": {
          "path": "target_date",
          "type": "date",
          "label": "Target Date"
        },
        "owner": {
          "path": "owner",
          "type": "text",
          "label": "Owner"
        }
      }
    },
    "project-sites": {
      "name": "Project Delivery Sites",
      "path": "/projects/{id}/delivery",
      "key": "sites",
      "page": "project-management.html",
      "title": "site_name",
      "code": "site_code",
      "parent": "projects",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "site_name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "site_code",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "site": {
          "path": "site_name",
          "type": "text",
          "label": "Site"
        },
        "project": {
          "path": "project",
          "type": "text",
          "label": "Project"
        },
        "planned_installation_date": {
          "path": "planned_installation_date",
          "type": "date",
          "label": "Planned Installation Date"
        },
        "location": {
          "path": "location",
          "type": "text",
          "label": "Location"
        }
      }
    },
    "project-delivery-events": {
      "name": "Project Delivery Events",
      "path": "/projects/{id}/delivery",
      "key": "events",
      "page": "project-management.html",
      "title": "summary",
      "code": "id",
      "parent": "projects",
      "pastFlag": false,
      "type": "event_type",
      "date": "occurred_on",
      "dateLabel": "occurred on",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "summary",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "id",
          "type": "text",
          "label": "Code"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "type": {
          "path": "event_type",
          "type": "text",
          "label": "Type"
        },
        "date": {
          "path": "occurred_on",
          "type": "date",
          "label": "Date"
        },
        "project": {
          "path": "project",
          "type": "text",
          "label": "Project"
        },
        "event_type": {
          "path": "event_type",
          "type": "text",
          "label": "Event Type"
        },
        "occurred_on": {
          "path": "occurred_on",
          "type": "date",
          "label": "Occurred On"
        }
      }
    },
    "assurance": {
      "name": "Assurance",
      "page": "assurance.html",
      "available": false,
      "notice": "This workspace has no connected structured register for this area yet. No records or counts can be inferred from navigation pages.",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        }
      }
    },
    "quality": {
      "name": "Quality",
      "page": "quality.html",
      "available": false,
      "notice": "This workspace has no connected structured register for this area yet. No records or counts can be inferred from navigation pages.",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        }
      }
    },
    "environment": {
      "name": "Environment",
      "page": "environment.html",
      "available": false,
      "notice": "This workspace has no connected structured register for this area yet. No records or counts can be inferred from navigation pages.",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        }
      }
    },
    "business-continuity": {
      "name": "Business Continuity",
      "page": "business-continuity.html",
      "available": false,
      "notice": "This workspace has no connected structured register for this area yet. No records or counts can be inferred from navigation pages.",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        }
      }
    },
    "project-documents": {
      "name": "Project Document Metadata",
      "path": "/projects/{id}/documents",
      "key": "documents",
      "title": "document_title",
      "code": "file_name",
      "owner": "uploaded_by",
      "parent": "projects",
      "page": "project-management.html",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "document_title",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "file_name",
          "type": "text",
          "label": "Code"
        },
        "owner": {
          "path": "uploaded_by",
          "type": "text",
          "label": "Owner"
        },
        "project": {
          "path": "project",
          "type": "text",
          "label": "Project"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "document_type": {
          "path": "document_type",
          "type": "text",
          "label": "Document Type"
        },
        "uploaded_at": {
          "path": "uploaded_at",
          "type": "date",
          "label": "Uploaded At"
        },
        "version_number": {
          "path": "version_number",
          "type": "number",
          "label": "Version Number"
        },
        "ai_processing_status": {
          "path": "ai_processing_status",
          "type": "text",
          "label": "Ai Processing Status"
        }
      }
    },
    "project-team": {
      "name": "Project Team Members",
      "path": "/projects/{id}/team",
      "key": "members",
      "title": "name",
      "code": "user_id",
      "owner": "name",
      "parent": "projects",
      "page": "project-management.html",
      "fields": {
        "id": {
          "path": "id",
          "type": "text",
          "label": "Id"
        },
        "title": {
          "path": "name",
          "type": "text",
          "label": "Title"
        },
        "code": {
          "path": "user_id",
          "type": "text",
          "label": "Code"
        },
        "owner": {
          "path": "name",
          "type": "text",
          "label": "Owner"
        },
        "project": {
          "path": "project",
          "type": "text",
          "label": "Project"
        },
        "status": {
          "path": "status",
          "type": "text",
          "label": "Status"
        },
        "active": {
          "path": "active",
          "type": "boolean",
          "label": "Active"
        },
        "granted_at": {
          "path": "granted_at",
          "type": "date",
          "label": "Granted At"
        }
      },
      "identity": [
        "user_id"
      ]
    }
  },
  "operators": [
    "equals",
    "not_equals",
    "contains",
    "in",
    "missing",
    "before",
    "after",
    "on_or_before",
    "on_or_after",
    "lt",
    "lte",
    "gt",
    "gte"
  ],
  "aggregates": [
    "count",
    "sum",
    "average",
    "min",
    "max",
    "percentage"
  ],
  "limits": {
    "conditions": 12,
    "parents": 40,
    "rows": 10000,
    "detail": 50
  }
};
