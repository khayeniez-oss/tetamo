import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: unknown) {
  const v = clean(value);
  return v ? v : null;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server environment is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const fullName = clean(body.fullName);
    const email = toNullable(body.email);
    const phone = clean(body.phone);
    const location = toNullable(body.location);
    const preferredWorkArea = toNullable(body.preferredWorkArea);
    const careerInterest = clean(body.careerInterest);
    const experienceLevel = clean(body.experienceLevel);
    const workBackground = toNullable(body.workBackground);
    const yearsExperienceRaw = clean(body.yearsExperience);
    const currentOrPreviousAgency = toNullable(body.agency);
    const propertyFocus = toNullable(body.propertyFocus);
    const languages = toNullable(body.languages);
    const notes = toNullable(body.notes);
    const agreeToContact = Boolean(body.agree);

    const yearsExperience =
      yearsExperienceRaw && !Number.isNaN(Number(yearsExperienceRaw))
        ? Number(yearsExperienceRaw)
        : null;

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    if (!careerInterest) {
      return NextResponse.json(
        { error: "Career interest is required." },
        { status: 400 }
      );
    }

    if (!experienceLevel) {
      return NextResponse.json(
        { error: "Experience level is required." },
        { status: 400 }
      );
    }

    if (!agreeToContact) {
      return NextResponse.json(
        { error: "You must agree to be contacted." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("career_applications")
      .insert({
        full_name: fullName,
        email,
        phone,
        location,
        preferred_work_area: preferredWorkArea,
        career_interest: careerInterest,
        experience_level: experienceLevel,
        work_background: workBackground,
        years_experience: yearsExperience,
        current_or_previous_agency: currentOrPreviousAgency,
        property_focus: propertyFocus,
        languages,
        notes,
        agree_to_contact: agreeToContact,
        status: "new",
        source: "career_page",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: "Career application submitted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}