import * as fs from 'fs';
import { faker } from '@faker-js/faker';

interface Student {
    district: string;
    school: string;
    schoolCode: string;
    class: string;
    code: string;
    firstName: string;
    lastName: string;
    middleName: string;
    studentId: string;
    dateOfBirth: string;
    gender: string;
    grade: number;
    activeUser: string;
    additionalIdNumber: string;
    ethnicityHispanicLatino: string;
    raceAmericanIndian: string;
    raceAsian: string;
    raceBlack: string;
    raceHawaiian: string;
    raceWhite: string;
    programCodeLunch: string;
    programCodeELL: string;
    programCodeMigrant: string;
    programCode504: string;
    programCodeGifted: string;
    programCodeTitleILang: string;
    programCodeIEP: string;
    programCodeSE: string;
    programCodeTitleIMath: string;
    programCodeOther1: string;
    programCodeOther2: string;
    braille: string;
    officeUseZ: string;
    officeUse1: string;
    officeUse2: string;
    officeUse3: string;
    officeUse4: string;
    officeUse5: string;
    officeUse6: string;
    officeUse7: string;
    officeUse8: string;
    officeUse9: string;
    officeUse10: string;
    officeUse11: string;
    officeUse12: string;
    officeUseV: string;
    officeUseQ: string;
    officeUseN: string;
    testAdminA: string;
    testAdminB: string;
    testAdminC: string;
    testAdminD: string;
    testAdminE: string;
    testAdminF: string;
    testAdminG: string;
    testAdminH: string;
    testAdminI: string;
    testAdminJ: string;
    testAdminK: string;
    testAdminL: string;
    testAdminM: string;
    testAdminN: string;
    adminCodeA: string;
    adminCodeB: string;
    adminCodeC: string;
    adminCodeD: string;
    adminCodeE: string;
    adminCodeF: string;
    adminCodeG: string;
    adminCodeH: string;
    adminCodeI: string;
    adminCodeJ: string;
    adminCodeK: string;
    adminCodeL: string;
    adminCodeM: string;
    adminCodeN: string;
    adminCodeO: string;
    adminCodeP: string;
    adminCodeQ: string;
    adminCodeR: string;
    adminCodeS: string;
    adminCodeT: string;
    homeReporting: string;
}

function generateStudent(index: number): Student {
    const grade = Math.floor(Math.random() * 13); // 0 to 12
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - (18 - grade); // Assuming most students graduate at ~18
    
    // Generate a date within the birth year
    const dob = faker.date.between({
        from: `${birthYear}-01-01`,
        to: `${birthYear}-12-31`
    });

    return {
        district: 'Apex',
        school: 'Apex High School',
        schoolCode: '',
        class: `Class ${grade}`,
        code: '',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        middleName: '',
        studentId: `APX${String(index + 1).padStart(3, '0')}`,
        dateOfBirth: dob.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }),
        gender: Math.random() > 0.5 ? 'M' : 'F',
        grade: grade,
        activeUser: 'Y',
        additionalIdNumber: '',
        ethnicityHispanicLatino: '',
        raceAmericanIndian: '',
        raceAsian: '',
        raceBlack: '',
        raceHawaiian: '',
        raceWhite: '',
        programCodeLunch: '',
        programCodeELL: '',
        programCodeMigrant: '',
        programCode504: '',
        programCodeGifted: '',
        programCodeTitleILang: '',
        programCodeIEP: '',
        programCodeSE: '',
        programCodeTitleIMath: '',
        programCodeOther1: '',
        programCodeOther2: '',
        braille: '',
        officeUseZ: '',
        officeUse1: '',
        officeUse2: '',
        officeUse3: '',
        officeUse4: '',
        officeUse5: '',
        officeUse6: '',
        officeUse7: '',
        officeUse8: '',
        officeUse9: '',
        officeUse10: '',
        officeUse11: '',
        officeUse12: '',
        officeUseV: '',
        officeUseQ: '',
        officeUseN: '',
        testAdminA: '',
        testAdminB: '',
        testAdminC: '',
        testAdminD: '',
        testAdminE: '',
        testAdminF: '',
        testAdminG: '',
        testAdminH: '',
        testAdminI: '',
        testAdminJ: '',
        testAdminK: '',
        testAdminL: '',
        testAdminM: '',
        testAdminN: '',
        adminCodeA: '',
        adminCodeB: '',
        adminCodeC: '',
        adminCodeD: '',
        adminCodeE: '',
        adminCodeF: '',
        adminCodeG: '',
        adminCodeH: '',
        adminCodeI: '',
        adminCodeJ: '',
        adminCodeK: '',
        adminCodeL: '',
        adminCodeM: '',
        adminCodeN: '',
        adminCodeO: '',
        adminCodeP: '',
        adminCodeQ: '',
        adminCodeR: '',
        adminCodeS: '',
        adminCodeT: '',
        homeReporting: ''
    };
}

function generateStudentData(numberOfStudents: number): void {
    const students: Student[] = [];
    
    for (let i = 0; i < numberOfStudents; i++) {
        students.push(generateStudent(i));
    }

    const header = 'District/Area *,School/Building *,School/Building Code,Class *,Code,First Name *,Last Name *,Middle Name,Unique Student ID *,Date of Birth *,Gender *,Grade *,Active User,Additional ID Number,Ethnicity-Hispanic or Latino,Race-American Indian or Alaska Native,Race-Asian,Race-Black or African American,Race-Native Hawaiian or Other Pacific Islander,Race-White,Program Code-Free/Reduced-Price Lunch,Program Code-ELL,Program Code-Migrant Student,Program Code-Section 504,Program Code-Gifted Talented,Program Code-Title I Language,Program Code-IEP,Program Code-SE,Program Code-Title I Math,Program Code-Other 1,Program Code-Other 2,Braille,Office Use-Z,Office Use-1,Office Use-2,Office Use-3,Office Use-4,Office Use-5,Office Use-6,Office Use-7,Office Use-8,Office Use-9,Office Use-10,Office Use-11,Office Use-12,Office Use-V,Office Use-Q,Office Use-N,Test Admin-A,Test Admin-B,Test Admin-C,Test Admin-D,Test Admin-E,Test Admin-F,Test Admin-G,Test Admin-H,Test Admin-I,Test Admin-J,Test Admin-K,Test Admin-L,Test Admin-M,Test Admin-N,Admin Code-A,Admin Code-B,Admin Code-C,Admin Code-D,Admin Code-E,Admin Code-F,Admin Code-G,Admin Code-H,Admin Code-I,Admin Code-J,Admin Code-K,Admin Code-L,Admin Code-M,Admin Code-N,Admin Code-O,Admin Code-P,Admin Code-Q,Admin Code-R,Admin Code-S,Admin Code-T,Home Reporting\n';
    const csvContent = students.map(student => 
        `${student.district},${student.school},${student.schoolCode},${student.class},${student.code},${student.firstName},${student.lastName},${student.middleName},${student.studentId},${student.dateOfBirth},${student.gender},${student.grade},${student.activeUser},${student.additionalIdNumber},${student.ethnicityHispanicLatino},${student.raceAmericanIndian},${student.raceAsian},${student.raceBlack},${student.raceHawaiian},${student.raceWhite},${student.programCodeLunch},${student.programCodeELL},${student.programCodeMigrant},${student.programCode504},${student.programCodeGifted},${student.programCodeTitleILang},${student.programCodeIEP},${student.programCodeSE},${student.programCodeTitleIMath},${student.programCodeOther1},${student.programCodeOther2},${student.braille},${student.officeUseZ},${student.officeUse1},${student.officeUse2},${student.officeUse3},${student.officeUse4},${student.officeUse5},${student.officeUse6},${student.officeUse7},${student.officeUse8},${student.officeUse9},${student.officeUse10},${student.officeUse11},${student.officeUse12},${student.officeUseV},${student.officeUseQ},${student.officeUseN},${student.testAdminA},${student.testAdminB},${student.testAdminC},${student.testAdminD},${student.testAdminE},${student.testAdminF},${student.testAdminG},${student.testAdminH},${student.testAdminI},${student.testAdminJ},${student.testAdminK},${student.testAdminL},${student.testAdminM},${student.testAdminN},${student.adminCodeA},${student.adminCodeB},${student.adminCodeC},${student.adminCodeD},${student.adminCodeE},${student.adminCodeF},${student.adminCodeG},${student.adminCodeH},${student.adminCodeI},${student.adminCodeJ},${student.adminCodeK},${student.adminCodeL},${student.adminCodeM},${student.adminCodeN},${student.adminCodeO},${student.adminCodeP},${student.adminCodeQ},${student.adminCodeR},${student.adminCodeS},${student.adminCodeT},${student.homeReporting}`
    ).join('\n');

    fs.writeFileSync('Student file.csv', header + csvContent);
    console.log(`Generated ${numberOfStudents} student records in 'Student file.csv'`);
}

// Generate n student records - you can change this number
generateStudentData(1299);