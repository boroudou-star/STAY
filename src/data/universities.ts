/**
 * Real careers-service and students' union pages for UK universities.
 * Every URL below came from a search of the university's or union's own website (each link opened and checked on 16 October 2026).
 * Pages move: if one breaks, replace it with the page from the same site.
 */

export interface UniLink {
  label: string;
  url: string;
}

export interface UniversitySources {
  name: string;
  /** Other names people type for it */
  aliases?: string[];
  careersEvents: UniLink;
  careersFairs?: UniLink;
  /** The booking platform for careers events, when it's separate */
  bookingPlatform?: UniLink;
  unionEvents?: UniLink;
  societies?: UniLink;
  /** Careers events specifically for international students */
  international?: UniLink;
}

const U = (name: string, careersEvents: UniLink, extra: Partial<Omit<UniversitySources, "name" | "careersEvents">> = {}): UniversitySources => ({ name, careersEvents, ...extra });
const L = (label: string, url: string): UniLink => ({ label, url });

export const UNIVERSITY_SOURCES: UniversitySources[] = [
  U("UCL", L("UCL Careers: upcoming events", "https://www.ucl.ac.uk/study/careers/ucl-careers/resources-and-services/come-event/upcoming-events"), {
    aliases: ["University College London"],
    careersFairs: L("UCL Careers Fairs", "https://www.ucl.ac.uk/study/careers/ucl-careers/resources-and-services/come-event/careers-fairs"),
    bookingPlatform: L("myUCLCareers (book events and appointments)", "https://uclcareers.targetconnect.net/student/home.html"),
    unionEvents: L("Students' Union UCL: what's on", "https://studentsunionucl.org/whats-on"),
    societies: L("Students' Union UCL: join a club or society", "https://studentsunionucl.org/join-club-or-society"),
    international: L("UCL Careers: international student events (working in the UK, visas)", "https://www.ucl.ac.uk/study/careers/ucl-careers/resources-and-services/come-event/international-student-events"),
  }),
  U("Imperial College London", L("Imperial Careers Service events", "https://www.imperial.ac.uk/careers/whats-on/careers-panels/"), {
    aliases: ["Imperial"],
    careersFairs: L("Imperial careers fairs", "https://www.imperial.ac.uk/careers/whats-on/careers-fairs/general-autumn-term-careers-fair/"),
    unionEvents: L("Imperial College Union", "https://www.imperialcollegeunion.org/"),
    societies: L("Imperial College Union clubs and societies A to Z", "https://www.imperialcollegeunion.org/activities/a-to-z"),
  }),
  U("King's College London", L("King's Careers events", "https://www.kcl.ac.uk/careers/supporting-you/events"), {
    aliases: ["KCL", "Kings College London", "King's"],
    bookingPlatform: L("King's CareerConnect", "https://www.kcl.ac.uk/careers/supporting-you/kings-careerconnect"),
    unionEvents: L("KCLSU events", "https://www.kclsu.org/events/"),
  }),
  U("London School of Economics (LSE)", L("LSE Careers recruitment events", "https://info.lse.ac.uk/current-students/careers/events/recruitment-events"), {
    aliases: ["LSE", "London School of Economics"],
    careersFairs: L("LSE Careers sector and themed events", "https://info.lse.ac.uk/current-students/careers/events/Sector-and-themed-events"),
    unionEvents: L("LSESU societies events", "https://www.lsesu.com/ents/eventlist/societies/"),
  }),
  U("Queen Mary University of London", L("Queen Mary Careers: attend events", "https://www.qmul.ac.uk/careers/attend-events/"), {
    aliases: ["QMUL", "Queen Mary"],
    unionEvents: L("QMSU what's on", "https://www.qmsu.org/whats_on/"),
    societies: L("QMSU clubs and societies events", "https://www.qmsu.org/ents/eventlist/society/"),
  }),
  U("City St George's, University of London", L("City St George's career development (events on CareersHub)", "https://studenthub.citystgeorges.ac.uk/career-development"), {
    aliases: ["City University", "City, University of London", "St George's"],
    unionEvents: L("City Students' Union events", "https://www.citystudents.co.uk/whatson/"),
  }),
  U("Royal Holloway, University of London", L("Royal Holloway careers events", "https://intranet.royalholloway.ac.uk/students/jobs-careers/events/go-to-a-careers-event.aspx"), {
    aliases: ["Royal Holloway", "RHUL"],
    careersFairs: L("Royal Holloway Careers and Placements Fair", "https://intranet.royalholloway.ac.uk/students/jobs-careers/events/careers-fair.aspx"),
    unionEvents: L("Royal Holloway Students' Union events", "https://www.su.rhul.ac.uk/events/"),
  }),
  U("SOAS University of London", L("SOAS Careers", "https://www.soas.ac.uk/soas-careers"), {
    aliases: ["SOAS"],
    unionEvents: L("SOAS Students' Union events", "https://events.soasunion.org/"),
    societies: L("SOAS SU societies", "https://soasunion.org/get-involved/societies/"),
  }),
  U("Birkbeck, University of London", L("Birkbeck career programmes", "https://www.bbk.ac.uk/student-services/careers-and-enterprise/career-programmes"), { aliases: ["Birkbeck"] }),
  U("Goldsmiths, University of London", L("Goldsmiths Careers Service", "https://www.gold.ac.uk/careers/"), { aliases: ["Goldsmiths"] }),
  U("University of Westminster", L("Westminster careers and employability events", "https://www.westminster.ac.uk/current-students/events/careers-and-employability"), { aliases: ["Westminster"] }),
  U("Brunel University of London", L("Brunel Student Professional Development", "https://students.brunel.ac.uk/career/welcome-to-the-professional-development-centre-pdc"), { aliases: ["Brunel", "Brunel University London"] }),
  U("University of Greenwich", L("Greenwich: meet employers and network", "https://www.gre.ac.uk/careers/meet-employers-and-network"), { aliases: ["Greenwich"] }),
  U("University of Oxford", L("Oxford Careers Service fairs", "https://www.careers.ox.ac.uk/careers-fairs"), {
    aliases: ["Oxford"],
    unionEvents: L("Oxford SU events", "https://www.oxfordsu.org/events/"),
    societies: L("Oxford SU clubs and societies", "https://www.oxfordsu.org/get-involved/clubs-and-societies/"),
  }),
  U("University of Cambridge", L("Cambridge Careers Service events, fairs and festivals", "https://www.careers.cam.ac.uk/event"), {
    aliases: ["Cambridge"],
    unionEvents: L("Cambridge SU what's on", "https://www.cambridgesu.co.uk/whatson/"),
  }),
  U("University of Edinburgh", L("Edinburgh Careers Service: what's on", "https://careers.ed.ac.uk/whats-on"), {
    aliases: ["Edinburgh"],
    careersFairs: L("Edinburgh fairs and flagship events", "https://careers.ed.ac.uk/flagship-events"),
    societies: L("Edinburgh University Students' Association societies", "https://www.eusa.ed.ac.uk/activities/societies/"),
  }),
  U("University of Glasgow", L("Glasgow Careers, Employability & Opportunity", "https://www.gla.ac.uk/myglasgow/careers/"), {
    aliases: ["Glasgow"],
    unionEvents: L("Glasgow University SRC what's on", "https://www.glasgowunisrc.org/whatson/"),
    societies: L("Glasgow University SRC clubs and societies", "https://www.glasgowunisrc.org/clubs-socs/find/"),
  }),
  U("University of St Andrews", L("St Andrews Careers Centre events", "https://www.st-andrews.ac.uk/careers/events/"), {
    aliases: ["St Andrews"],
    unionEvents: L("St Andrews Students' Association society events", "https://www.yourunion.net/events/societies/"),
  }),
  U("University of Manchester", L("Manchester Careers Service fairs", "https://www.careers.manchester.ac.uk/events/fairs/"), {
    aliases: ["Manchester", "UoM"],
    unionEvents: L("University of Manchester Students' Union events", "https://manchesterstudentsunion.com/events"),
  }),
  U("University of Birmingham", L("Birmingham Careers Network events", "https://intranet.birmingham.ac.uk/student/careers/events/index.aspx"), {
    aliases: ["Birmingham"],
    unionEvents: L("Guild of Students what's on", "https://www.guildofstudents.com/ents/eventlist/"),
  }),
  U("University of Bristol", L("Bristol Careers Service: what's on", "https://www.bristol.ac.uk/careers/whats-on/"), {
    aliases: ["Bristol"],
    unionEvents: L("Bristol SU what's on", "https://www.bristolsu.org.uk/whats-on"),
  }),
  U("University of Warwick", L("Warwick careers events", "https://warwick.ac.uk/services/careers/events/"), {
    aliases: ["Warwick"],
    careersFairs: L("Warwick careers fairs", "https://warwick.ac.uk/services/careers/events/careersfairs/"),
    unionEvents: L("Warwick SU events", "https://www.warwicksu.com/events/"),
    societies: L("Warwick SU societies events", "https://www.warwicksu.com/societies-sports/societies/events/"),
  }),
  U("University of Leeds", L("Leeds Careers Centre events", "https://careerweb.leeds.ac.uk/events/full"), {
    aliases: ["Leeds"],
    careersFairs: L("Leeds careers fairs", "https://store.leeds.ac.uk/conferences-and-events/careers-centre/careers-fairs"),
    unionEvents: L("Leeds University Union what's on", "https://www.luu.org.uk/union-events/"),
    societies: L("LUU clubs and societies", "https://engage.luu.org.uk/groups"),
  }),
  U("University of Sheffield", L("Sheffield Careers Service events", "https://sheffield.ac.uk/careers/support/services/events"), {
    aliases: ["Sheffield"],
    unionEvents: L("Sheffield Students' Union work and employability events", "https://su.sheffield.ac.uk/advice-and-support/work-and-employability/events"),
  }),
  U("University of Nottingham", L("Nottingham careers fairs", "https://www.nottingham.ac.uk/careers/students/events/careerfairs/index.aspx"), {
    aliases: ["Nottingham"],
    unionEvents: L("UoNSU club and society events", "https://www.su.nottingham.ac.uk/whats-on-club-socs/"),
  }),
  U("University of Southampton", L("Southampton careers fairs", "https://store.southampton.ac.uk/conferences-and-events/careers-employability-and-student-enterprise/careers-fairs"), {
    aliases: ["Southampton"],
    unionEvents: L("SUSU clubs and societies events", "https://boxoffice.susu.org/view/society-events"),
  }),
  U("Durham University", L("Durham Careers, Employability and Enterprise", "https://www.durham.ac.uk/study/careers-employability-enterprise/"), {
    aliases: ["Durham"],
    societies: L("Durham SU groups", "https://www.durhamsu.com/groups"),
  }),
  U("University of Exeter", L("Exeter Career Zone", "https://www.exeter.ac.uk/students/careers/"), {
    aliases: ["Exeter"],
    careersFairs: L("Exeter careers fairs", "https://www.exeter.ac.uk/students/careers/events/careersfairs/"),
    societies: L("Exeter Students' Guild societies", "https://events.exeterguild.com/societies/"),
  }),
  U("University of Bath", L("Bath Careers Service", "https://www.bath.ac.uk/professional-services/careers/"), {
    aliases: ["Bath"],
    unionEvents: L("The SU Bath what's on", "https://www.thesubath.com/whats-on/"),
  }),
  U("University of York", L("York careers: what's on", "https://www.york.ac.uk/students/work-volunteering-careers/events/"), {
    aliases: ["York"],
    societies: L("YUSU sports and societies", "https://yusu.org/student-life/clubs-and-socs"),
  }),
  U("Lancaster University", L("Lancaster Careers", "https://www.lancaster.ac.uk/careers/"), {
    aliases: ["Lancaster"],
    unionEvents: L("Lancaster University Students' Union events", "https://lusu.co.uk/events"),
  }),
  U("Loughborough University", L("Loughborough: attend careers events", "https://www.lboro.ac.uk/services/student-services/topics/attend-events/"), {
    aliases: ["Loughborough"],
    unionEvents: L("Loughborough Students' Union", "https://lsu.co.uk/"),
  }),
  U("Newcastle University", L("Newcastle Careers Service", "https://www.ncl.ac.uk/careers/"), {
    aliases: ["Newcastle"],
    unionEvents: L("Newcastle University Students' Union", "https://nusu.co.uk/"),
  }),
  U("University of Liverpool", L("Liverpool: connect with employers", "https://www.liverpool.ac.uk/careers/students/connect-with-employers/"), {
    aliases: ["Liverpool"],
    unionEvents: L("Liverpool Guild of Students society events", "https://www.liverpoolguild.org/ents/eventlist/society/"),
  }),
  U("Cardiff University", L("Cardiff careers and employability (fairs and employer events)", "https://www.cardiff.ac.uk/study/student-life/student-support/careers-and-employability"), {
    aliases: ["Cardiff"],
    unionEvents: L("Cardiff Students' Union society events", "https://www.cardiffstudents.com/activities/societies/events/"),
  }),
  U("Queen's University Belfast", L("Queen's careers fairs", "https://www.qub.ac.uk/directorates/sgc/careers/fairs/"), {
    aliases: ["QUB", "Queens University Belfast"],
    unionEvents: L("Queen's Students' Union what's on", "https://www.qubsu.org/Events/"),
  }),
  U("University of Surrey", L("Surrey: attend a careers event", "https://my.surrey.ac.uk/employability/start-ups-and-student-enterprise/attend-careers-event"), {
    aliases: ["Surrey"],
    societies: L("Surrey Students' Union clubs and societies A to Z", "https://surreyunion.org/your-activity/clubs-and-societies-a-z/"),
  }),
  U("University of Sussex", L("Sussex careers events", "https://student.sussex.ac.uk/careers/events"), { aliases: ["Sussex"] }),
  U("University of Leicester", L("Leicester Career Development Service (Festival of Careers, employer events)", "https://le.ac.uk/career-development-service"), { aliases: ["Leicester"] }),
  U("University of Reading", L("Reading upcoming careers events", "https://www.reading.ac.uk/essentials/Careers/Events/Upcoming-events"), { aliases: ["Reading"] }),
  U("Heriot-Watt University", L("Heriot-Watt Careers Service", "https://www.hw.ac.uk/students/careers-service/supporting-our-students-and-graduates/students"), { aliases: ["Heriot-Watt", "Heriot Watt"] }),
  U("University of Strathclyde", L("Strathclyde Careers Service events", "https://www.strath.ac.uk/professionalservices/careers/events/"), { aliases: ["Strathclyde"] }),
  U("University of Aberdeen", L("Aberdeen careers fairs", "https://www.abdn.ac.uk/careers/experience/fairs/"), { aliases: ["Aberdeen"] }),
  U("University of Dundee", L("Dundee Careers Service events", "https://www.dundee.ac.uk/careers/events"), { aliases: ["Dundee"] }),
  U("Coventry University", L("Coventry Careers and Experience Team", "https://www.coventry.ac.uk/study-at-coventry/student-support/enhance-your-employability/careers-and-employability-services/"), { aliases: ["Coventry"] }),
  U("Manchester Metropolitan University", L("Manchester Met careers events", "https://www.mmu.ac.uk/careers/students/events"), { aliases: ["Manchester Met", "MMU"] }),
  U("Nottingham Trent University", L("NTU employability events", "https://www.ntu.ac.uk/studenthub/student-help-advice-and-services/employability/employability-events"), { aliases: ["NTU", "Nottingham Trent"] }),
  U("Oxford Brookes University", L("Oxford Brookes careers: what's on", "https://www.brookes.ac.uk/students/careers/whats-on"), { aliases: ["Oxford Brookes", "Brookes"] }),
  U("Ulster University", L("Ulster careers fairs", "https://www.ulster.ac.uk/student/employability/careers-fairs"), { aliases: ["Ulster"] }),
  U("Swansea University", L("Swansea careers events", "https://hwb.swansea.ac.uk/careers/events/"), { aliases: ["Swansea"] }),
  U("Aston University", L("Aston Careers Fest", "https://www.aston.ac.uk/careers-fest"), { aliases: ["Aston"] }),
  U("University of East Anglia", L("UEA CareerCentral events", "https://store.uea.ac.uk/product-catalogue/careercentral/events"), { aliases: ["UEA", "East Anglia"] }),
  U("University of Kent", L("Kent careers events", "https://student.kent.ac.uk/careers/events"), { aliases: ["Kent"] }),
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Finds a university by its name or a common alias, case and punctuation insensitive. */
export function universitySources(university?: string): UniversitySources | undefined {
  const n = norm(university ?? "");
  if (!n) return undefined;
  return UNIVERSITY_SOURCES.find((u) => [u.name, ...(u.aliases ?? [])].some((a) => norm(a) === n));
}

/** Searches for anything we don't have a direct link for (unions we haven't verified, other universities). */
export function uniSearch(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
