-- Hospital planning model: one shared jsonb row
-- Run this in the Supabase SQL editor after creating the project.

create table if not exists public.planning_models (
  id text primary key,
  model jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create or replace function public.set_planning_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists planning_models_set_updated on public.planning_models;
create trigger planning_models_set_updated
before insert or update on public.planning_models
for each row
execute function public.set_planning_updated();

alter table public.planning_models enable row level security;

drop policy if exists planning_models_select_public on public.planning_models;
create policy planning_models_select_public
on public.planning_models
for select
to anon, authenticated
using (true);

drop policy if exists planning_models_insert_auth on public.planning_models;
create policy planning_models_insert_auth
on public.planning_models
for insert
to authenticated
with check (true);

drop policy if exists planning_models_update_auth on public.planning_models;
create policy planning_models_update_auth
on public.planning_models
for update
to authenticated
using (true)
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.planning_models;
exception
  when duplicate_object then null;
end;
$$;

insert into public.planning_models (id, model)
values (
  'default',
  $seed$
{
  "version": 1,
  "title": "Hospital Capacity & Capital Plan",
  "totalBeds": 200,
  "rounding": "ceil",
  "theatre": {
    "otPerBeds": 50,
    "minorPerOt": 3,
    "ldPerBeds": 50,
    "cathLabCount": 1,
    "labourSpecialtyId": "labour-delivery",
    "cathSpecialtyId": "cath-lab"
  },
  "departments": [
    {
      "id": "nursery",
      "name": "Nursery",
      "sharePercent": 5,
      "furniture": false
    },
    {
      "id": "nicu",
      "name": "NICU",
      "sharePercent": 3,
      "furniture": false,
      "kpiCritical": true
    },
    {
      "id": "prepost-ld",
      "name": "Pre / Post Op Care — L&D",
      "sharePercent": 3,
      "furniture": true
    },
    {
      "id": "icu",
      "name": "ICU / CCU / PICU",
      "sharePercent": 12,
      "furniture": true,
      "kpiCritical": true
    },
    {
      "id": "ward",
      "name": "Ward Beds",
      "sharePercent": 35,
      "furniture": true
    },
    {
      "id": "daycare",
      "name": "Day Care Beds",
      "sharePercent": 3,
      "furniture": true
    },
    {
      "id": "private",
      "name": "Private Rooms",
      "sharePercent": 12,
      "furniture": true
    },
    {
      "id": "executive-rooms",
      "name": "Executive Rooms",
      "sharePercent": 3,
      "furniture": true
    },
    {
      "id": "isolation",
      "name": "Isolation Rooms",
      "sharePercent": 4,
      "furniture": true
    },
    {
      "id": "emergency",
      "name": "Emergency",
      "sharePercent": 8,
      "furniture": true,
      "kpiCritical": true
    },
    {
      "id": "dialysis",
      "name": "Dialysis",
      "sharePercent": 5,
      "furniture": true
    },
    {
      "id": "prepost-op",
      "name": "Pre / Post Op Care",
      "sharePercent": 5,
      "furniture": true
    },
    {
      "id": "executive-suites",
      "name": "Executive Suites",
      "sharePercent": 2,
      "furniture": true
    }
  ],
  "specialties": [
    {
      "id": "dialysis",
      "name": "Dialysis Unit",
      "enabled": true
    },
    {
      "id": "cath-lab",
      "name": "Cath Lab",
      "enabled": true
    },
    {
      "id": "chemo",
      "name": "Chemotherapy Day Care",
      "enabled": false
    },
    {
      "id": "lithotripsy",
      "name": "Lithotripsy / Endourology",
      "enabled": false
    },
    {
      "id": "labour-delivery",
      "name": "Labour & Delivery",
      "enabled": true
    },
    {
      "id": "neurodiagnostics",
      "name": "Neurodiagnostics / EEG",
      "enabled": false
    },
    {
      "id": "pft",
      "name": "Pulmonary Function Lab",
      "enabled": false
    },
    {
      "id": "endoscopy",
      "name": "Endoscopy Unit",
      "enabled": false
    },
    {
      "id": "ophthalmology",
      "name": "Ophthalmology",
      "enabled": false
    },
    {
      "id": "dental",
      "name": "Dental",
      "enabled": false
    }
  ],
  "items": [
    {
      "id": "patient-bed",
      "name": "Patient Bed",
      "category": "furniture",
      "premiumUnit": 100,
      "budgetUnit": 70,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "furnitureBeds",
          "n": 1
        }
      ]
    },
    {
      "id": "side-table",
      "name": "Side Table",
      "category": "furniture",
      "premiumUnit": 60,
      "budgetUnit": 30,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "furnitureBeds",
          "n": 1
        }
      ]
    },
    {
      "id": "over-bed-table",
      "name": "Over Bed Table",
      "category": "furniture",
      "premiumUnit": 40,
      "budgetUnit": 20,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "furnitureBeds",
          "n": 1
        }
      ]
    },
    {
      "id": "bedhead-unit",
      "name": "Bedhead Unit",
      "category": "furniture",
      "premiumUnit": 20,
      "budgetUnit": 10,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "furnitureBeds",
          "n": 1
        }
      ]
    },
    {
      "id": "patient-monitor",
      "name": "Patient Monitor",
      "category": "ward-equipment",
      "premiumUnit": 300,
      "budgetUnit": 150,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "dept:nursery.beds",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:prepost-ld.beds",
          "n": 3
        },
        {
          "type": "timesSource",
          "source": "dept:icu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:ward.beds",
          "n": 16
        },
        {
          "type": "perSource",
          "source": "dept:daycare.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:private.beds",
          "n": 6
        },
        {
          "type": "perSource",
          "source": "dept:executive-rooms.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:isolation.beds",
          "n": 2
        },
        {
          "type": "timesSource",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:dialysis.beds",
          "n": 8
        },
        {
          "type": "perSource",
          "source": "dept:prepost-op.beds",
          "n": 4
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-suites.beds",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "ot",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "minorOt",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "cathLab",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "labourDelivery",
          "n": 2
        }
      ]
    },
    {
      "id": "infusion-pump",
      "name": "Infusion Pump",
      "category": "ward-equipment",
      "premiumUnit": 100,
      "budgetUnit": 60,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "dept:nursery.beds",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:prepost-ld.beds",
          "n": 3
        },
        {
          "type": "timesSource",
          "source": "dept:icu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:ward.beds",
          "n": 16
        },
        {
          "type": "perSource",
          "source": "dept:daycare.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:private.beds",
          "n": 6
        },
        {
          "type": "perSource",
          "source": "dept:executive-rooms.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:isolation.beds",
          "n": 2
        },
        {
          "type": "timesSource",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:dialysis.beds",
          "n": 8
        },
        {
          "type": "perSource",
          "source": "dept:prepost-op.beds",
          "n": 4
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-suites.beds",
          "n": 1
        }
      ]
    },
    {
      "id": "syringe-pump",
      "name": "Syringe Pump",
      "category": "ward-equipment",
      "premiumUnit": 100,
      "budgetUnit": 60,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "dept:nursery.beds",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:prepost-ld.beds",
          "n": 3
        },
        {
          "type": "timesSource",
          "source": "dept:icu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:ward.beds",
          "n": 16
        },
        {
          "type": "perSource",
          "source": "dept:daycare.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:private.beds",
          "n": 6
        },
        {
          "type": "perSource",
          "source": "dept:executive-rooms.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:isolation.beds",
          "n": 2
        },
        {
          "type": "timesSource",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:dialysis.beds",
          "n": 8
        },
        {
          "type": "perSource",
          "source": "dept:prepost-op.beds",
          "n": 4
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-suites.beds",
          "n": 1
        }
      ]
    },
    {
      "id": "vital-monitor",
      "name": "Vital Signs Monitor",
      "category": "ward-equipment",
      "premiumUnit": 60,
      "budgetUnit": 30,
      "enabled": true,
      "contributions": [
        {
          "type": "perSource",
          "source": "dept:nursery.beds",
          "n": 6
        },
        {
          "type": "oneIfExists",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:prepost-ld.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:icu.beds",
          "n": 15
        },
        {
          "type": "perSource",
          "source": "dept:ward.beds",
          "n": 16
        },
        {
          "type": "perSource",
          "source": "dept:daycare.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:private.beds",
          "n": 10
        },
        {
          "type": "perSource",
          "source": "dept:executive-rooms.beds",
          "n": 5
        },
        {
          "type": "perSource",
          "source": "dept:isolation.beds",
          "n": 3
        },
        {
          "type": "perSource",
          "source": "dept:emergency.beds",
          "n": 8
        },
        {
          "type": "perSource",
          "source": "dept:dialysis.beds",
          "n": 13
        },
        {
          "type": "perSource",
          "source": "dept:prepost-op.beds",
          "n": 6
        },
        {
          "type": "perSource",
          "source": "dept:executive-suites.beds",
          "n": 3
        }
      ]
    },
    {
      "id": "ventilator",
      "name": "Ventilator",
      "category": "ward-equipment",
      "premiumUnit": 400,
      "budgetUnit": 300,
      "enabled": true,
      "contributions": [
        {
          "type": "perSource",
          "source": "dept:nursery.beds",
          "n": 4
        },
        {
          "type": "oneIfExists",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "dept:icu.beds",
          "n": 4
        },
        {
          "type": "oneIfExists",
          "source": "dept:isolation.beds",
          "n": 1
        }
      ]
    },
    {
      "id": "crash-cart",
      "name": "Crash Cart",
      "category": "ward-equipment",
      "premiumUnit": 100,
      "budgetUnit": 60,
      "enabled": true,
      "contributions": [
        {
          "type": "oneIfExists",
          "source": "dept:nursery.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:prepost-ld.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:icu.beds",
          "n": 2
        },
        {
          "type": "oneIfExists",
          "source": "dept:ward.beds",
          "n": 3
        },
        {
          "type": "oneIfExists",
          "source": "dept:daycare.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:private.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-rooms.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:dialysis.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:prepost-op.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-suites.beds",
          "n": 1
        }
      ]
    },
    {
      "id": "defibrillator",
      "name": "Defibrillator",
      "category": "ward-equipment",
      "premiumUnit": 200,
      "budgetUnit": 100,
      "enabled": true,
      "contributions": [
        {
          "type": "oneIfExists",
          "source": "dept:nursery.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:nicu.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:prepost-ld.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:icu.beds",
          "n": 2
        },
        {
          "type": "oneIfExists",
          "source": "dept:ward.beds",
          "n": 3
        },
        {
          "type": "oneIfExists",
          "source": "dept:daycare.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:private.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-rooms.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:dialysis.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:prepost-op.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:executive-suites.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "ot",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "cathLab",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "labourDelivery",
          "n": 1
        }
      ]
    },
    {
      "id": "ecg-machine",
      "name": "ECG Machine",
      "category": "ward-equipment",
      "premiumUnit": 200,
      "budgetUnit": 150,
      "enabled": true,
      "contributions": [
        {
          "type": "oneIfExists",
          "source": "dept:icu.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:ward.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:private.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:emergency.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "dept:dialysis.beds",
          "n": 1
        }
      ]
    },
    {
      "id": "baby-warmer",
      "name": "Baby Warmer",
      "category": "ward-equipment",
      "premiumUnit": 300,
      "budgetUnit": 250,
      "enabled": true,
      "contributions": [
        {
          "type": "perSource",
          "source": "dept:nursery.beds",
          "n": 4
        },
        {
          "type": "perSource",
          "source": "dept:nicu.beds",
          "n": 2
        },
        {
          "type": "oneIfExists",
          "source": "dept:prepost-ld.beds",
          "n": 1
        },
        {
          "type": "oneIfExists",
          "source": "ot",
          "n": 1
        },
        {
          "type": "perSource",
          "source": "labourDelivery",
          "n": 2
        }
      ]
    },
    {
      "id": "phototherapy",
      "name": "Phototherapy Unit",
      "category": "ward-equipment",
      "premiumUnit": 300,
      "budgetUnit": 250,
      "enabled": true,
      "contributions": [
        {
          "type": "perSource",
          "source": "dept:nursery.beds",
          "n": 3
        },
        {
          "type": "perSource",
          "source": "dept:nicu.beds",
          "n": 3
        }
      ]
    },
    {
      "id": "incubator",
      "name": "Incubator",
      "category": "ward-equipment",
      "premiumUnit": 300,
      "budgetUnit": 220,
      "enabled": true,
      "contributions": [
        {
          "type": "perSource",
          "source": "dept:nursery.beds",
          "n": 3
        },
        {
          "type": "perSource",
          "source": "dept:nicu.beds",
          "n": 3
        }
      ]
    },
    {
      "id": "pendants",
      "name": "Pendant",
      "category": "theatre-equipment",
      "premiumUnit": 150,
      "budgetUnit": 100,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "ot",
          "n": 2
        },
        {
          "type": "timesSource",
          "source": "cathLab",
          "n": 1
        }
      ]
    },
    {
      "id": "ot-light",
      "name": "OT Light",
      "category": "theatre-equipment",
      "premiumUnit": 150,
      "budgetUnit": 100,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "ot",
          "n": 2
        },
        {
          "type": "timesSource",
          "source": "minorOt",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "cathLab",
          "n": 2
        }
      ]
    },
    {
      "id": "anesthesia",
      "name": "Anaesthesia Machine",
      "category": "theatre-equipment",
      "premiumUnit": 300,
      "budgetUnit": 250,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "ot",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "cathLab",
          "n": 1
        }
      ]
    },
    {
      "id": "ot-table",
      "name": "OT Table",
      "category": "theatre-equipment",
      "premiumUnit": 2000,
      "budgetUnit": 1500,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "ot",
          "n": 1
        },
        {
          "type": "timesSource",
          "source": "minorOt",
          "n": 1
        }
      ]
    },
    {
      "id": "c-arm",
      "name": "C-Arm",
      "category": "theatre-equipment",
      "premiumUnit": 6000,
      "budgetUnit": 3000,
      "enabled": true,
      "contributions": [
        {
          "type": "oneIfExists",
          "source": "ot",
          "n": 1
        }
      ]
    },
    {
      "id": "delivery-table",
      "name": "Delivery Table",
      "category": "theatre-equipment",
      "premiumUnit": 3000,
      "budgetUnit": 2000,
      "enabled": true,
      "contributions": [
        {
          "type": "timesSource",
          "source": "labourDelivery",
          "n": 1
        }
      ]
    },
    {
      "id": "cssd",
      "name": "CSSD",
      "category": "theatre-equipment",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "oneIfExists",
          "source": "ot",
          "n": 1
        }
      ]
    },
    {
      "id": "x-ray",
      "name": "X-Ray",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "ct-scan",
      "name": "CT-Scan",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "mri",
      "name": "MRI",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "dexa",
      "name": "DEXA",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "ultrasound",
      "name": "Ultrasound",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "mammography",
      "name": "Mammography",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "2d-echo",
      "name": "2D Echo",
      "category": "diagnostic",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-abg-machine",
      "name": "ABG Machine",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-auto-hematology-analyser",
      "name": "Auto Hematology Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-biochemistry-analyser",
      "name": "Biochemistry Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-biosafety-cabinet",
      "name": "Biosafety Cabinet",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-blood-cell-counter",
      "name": "Blood Cell Counter",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-centrifuge",
      "name": "Centrifuge",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-coagulation-analyser",
      "name": "Coagulation Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-cyclomixer",
      "name": "Cyclomixer",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-densitometer",
      "name": "Densitometer",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-dry-oven",
      "name": "Dry Oven",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-electrolyte-analyser",
      "name": "Electrolyte Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-electronic-balance",
      "name": "Electronic Balance",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-flourescent-immunoassay",
      "name": "Flourescent Immunoassay",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-grossing-station",
      "name": "Grossing Station",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-hotplate",
      "name": "Hotplate",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-immunoassay-analyser",
      "name": "Immunoassay Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-incubator-lab",
      "name": "Incubator Lab",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-microscope",
      "name": "Microscope",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-orbital-shaker",
      "name": "Orbital Shaker",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-portable-steam-sterilizer",
      "name": "Portable Steam Sterilizer",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-roller-mixer",
      "name": "Roller Mixer",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-rotary-shaker",
      "name": "Rotary Shaker",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-urine-analyser",
      "name": "Urine Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-water-bath",
      "name": "Water Bath",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-immunology-analyser",
      "name": "Immunology Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-blood-culture-analyser",
      "name": "Blood Culture Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    },
    {
      "id": "lab-hb-analyser",
      "name": "HB Analyser",
      "category": "laboratory",
      "premiumUnit": 0,
      "budgetUnit": 0,
      "enabled": true,
      "contributions": [
        {
          "type": "constant",
          "value": 1
        }
      ]
    }
  ],
  "capex": {
    "fxRate": 2650,
    "landExcluded": true,
    "areaBands": [
      {
        "beds": 50,
        "sqftPerBed": 1260
      },
      {
        "beds": 100,
        "sqftPerBed": 1800
      },
      {
        "beds": 200,
        "sqftPerBed": 1700
      },
      {
        "beds": 300,
        "sqftPerBed": 1600
      },
      {
        "beds": 500,
        "sqftPerBed": 1500
      },
      {
        "beds": 1000,
        "sqftPerBed": 1400
      }
    ],
    "lines": [
      {
        "id": "grey",
        "name": "Grey Structure",
        "ratePerSqft": 1500
      },
      {
        "id": "finishing",
        "name": "Finishing",
        "ratePerSqft": 1850
      },
      {
        "id": "plumbing",
        "name": "Plumbing",
        "ratePerSqft": 400
      },
      {
        "id": "electrical",
        "name": "Electrical",
        "ratePerSqft": 500
      },
      {
        "id": "gases",
        "name": "Medical Gases",
        "ratePerSqft": 350
      },
      {
        "id": "hvac",
        "name": "HVAC",
        "ratePerSqft": 2500
      },
      {
        "id": "medical-equipment",
        "name": "Medical Equipment",
        "ratePerSqft": 0,
        "fromBom": true
      },
      {
        "id": "power",
        "name": "Power Generation",
        "ratePerSqft": 280
      },
      {
        "id": "architecture",
        "name": "Architectural Planning",
        "ratePerSqft": 250
      },
      {
        "id": "incinerator",
        "name": "Incinerator",
        "ratePerSqft": 85
      },
      {
        "id": "wtp",
        "name": "Water Treatment Plant",
        "ratePerSqft": 250
      }
    ]
  }
}
$seed$::jsonb
)
on conflict (id) do update
set model = excluded.model
where jsonb_typeof(planning_models.model->'items') is distinct from 'array'
   or jsonb_array_length(planning_models.model->'items') = 0;
