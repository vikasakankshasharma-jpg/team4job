"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ExperienceProps {
    data: any;
    updateData: (data: any) => void;
}

const SKILLS = ["CCTV Installation", "Smart Home Setup", "Video Doorbell", "Biometric Systems", "Networking", "Electric Locking"];

export function Experience({ data, updateData }: ExperienceProps) {

    const toggleSkill = (skill: string) => {
        const currentSkills = data.skills || [];
        if (currentSkills.includes(skill)) {
            updateData({ ...data, skills: currentSkills.filter((s: string) => s !== skill) });
        } else {
            updateData({ ...data, skills: [...currentSkills, skill] });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Experience & Skills</h2>

            <div className="space-y-3">
                <Label className="text-base">Years of Experience</Label>
                <RadioGroup
                    value={data.experience || "0-2"}
                    onValueChange={(val) => updateData({ ...data, experience: val })}
                    className="flex flex-col space-y-1"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="0-2" id="r1" />
                        <Label htmlFor="r1">0 - 2 Years</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3-5" id="r2" />
                        <Label htmlFor="r2">3 - 5 Years</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="5+" id="r3" />
                        <Label htmlFor="r3">5+ Years</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="space-y-3">
                <Label className="text-base">Select Your Skills</Label>
                <div className="grid grid-cols-2 gap-4">
                    {SKILLS.map((skill) => (
                        <div key={skill} className="flex items-center space-x-2">
                            <Checkbox
                                id={skill}
                                checked={(data.skills || []).includes(skill)}
                                onCheckedChange={() => toggleSkill(skill)}
                            />
                            <Label htmlFor={skill} className="font-normal cursor-pointer select-none">{skill}</Label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
