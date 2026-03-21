export function getAgeOnDate(dateOfBirth: string, referenceDate = new Date()) {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function isMinorByBirthDate(dateOfBirth?: string | null, referenceDate = new Date()) {
  if (!dateOfBirth) return false;
  const age = getAgeOnDate(dateOfBirth, referenceDate);
  return age !== null && age < 18;
}

export function getHockeyAgeBand(dateOfBirth?: string | null, referenceDate = new Date()) {
  if (!dateOfBirth) return null;
  const age = getAgeOnDate(dateOfBirth, referenceDate);
  if (age === null) return null;
  if (age <= 6) return "U7";
  if (age <= 8) return "U9";
  if (age <= 10) return "U11";
  if (age <= 12) return "U13";
  if (age <= 14) return "U15";
  if (age <= 16) return "U17";
  if (age <= 19) return "U20";
  return "Senioren";
}

export function getSuggestedGroupIdsForAgeBand<T extends { id: string; ageBand: string | null; groupType?: string | null }>(
  groups: T[],
  ageBand?: string | null,
) {
  if (!ageBand) return [];
  const exact = groups.filter((group) => group.ageBand === ageBand);
  if (exact.length > 0) return exact.map((group) => group.id);
  if (ageBand === "Senioren") {
    return groups
      .filter((group) => group.groupType === "team" && (group.ageBand === "Senioren" || !group.ageBand))
      .map((group) => group.id);
  }
  return [];
}
