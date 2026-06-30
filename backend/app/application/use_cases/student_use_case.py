import os
import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.student import StudentModel as Student
from app.presentation.schemas.student import SubmissionRequest

UPLOAD_DIR = "uploads"

def save_photo(file: UploadFile) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"{uuid_lib.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    content = file.file.read()
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/{filename}"


def create_submission(db: Session, user_id: str, data: SubmissionRequest) -> Student:
    name = find_name_from_nrp(data.nrp)
    if data.nrp[2] == "2" and data.nrp[3] == "5":
        major = "Teknik Informatika"
    elif data.nrp[2] == "5" and data.nrp[3] == "3":
        major = "Rekayasa Perangkat Lunak"
    elif data.nrp[2] == "5" and data.nrp[3] == "4":
        major = "Rekayasa Kecerdasan Artifisial"
    else:
        major = "Unknown"

    student = Student(
        user_id=user_id,
        nrp=data.nrp,
        name=name,
        major=major,
        hometown=data.asal_daerah,
        hobbies=",".join(data.hobi),
        first_impression=data.first_impression,
        longitude=data.longitude,
        latitude=data.latitude,
        captured_at=data.captured_at,
        photo_url=data.photo_url,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def resolve_nrp_data(nrp: str, db: Session | None = None) -> dict:
    if db is not None:
        existing = db.query(Student).filter(Student.nrp == nrp).first()
        if existing is not None:
            return {"name": existing.name, "major": existing.major}

    name = find_name_from_nrp(nrp)
    if len(nrp) >= 4:
        if nrp[2] == "2" and nrp[3] == "5":
            major = "Teknik Informatika"
        elif nrp[2] == "5" and nrp[3] == "3":
            major = "Rekayasa Perangkat Lunak"
        elif nrp[2] == "5" and nrp[3] == "4":
            major = "Rekayasa Kecerdasan Artifisial"
        else:
            major = "Unknown"
    else:
        major = "Unknown"
    return {"name": name, "major": major}


def get_students(db: Session, user_id: str) -> list[Student]:
    return (
        db.query(Student)
        .filter(Student.user_id == user_id)
        .order_by(Student.created_at.desc())
        .all()
    )


def get_student(db: Session, user_id: str, student_id: str) -> Student:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.user_id == user_id)
        .first()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


def search_students_by_nrp(db: Session, user_id: str, nrp: str) -> list[Student]:
    return (
        db.query(Student)
        .filter(Student.user_id == user_id, Student.nrp.like(f"%{nrp}%"))
        .order_by(Student.nrp)
        .all()
    )


def get_roster(
    db: Session,
    user_id: str,
    page: int = 1,
    per_page: int = 20,
    search: str = "",
    major: str = "",
    status: str = "",
    all_: bool = False,
) -> dict:
    submissions = {
        s.nrp: s
        for s in db.query(Student).filter(Student.user_id == user_id).all()
    }

    entries = []
    for nrp, name in _NRP_MAP.items():
        if search and search.lower() not in nrp.lower() and search.lower() not in name.lower():
            continue
        sub = submissions.get(nrp)
        entry_major = resolve_nrp_data(nrp)["major"]
        if major and entry_major != major:
            continue
        submitted = sub is not None
        if status == "submitted" and not submitted:
            continue
        if status == "pending" and submitted:
            continue
        entries.append({
            "nrp": nrp,
            "name": name,
            "major": entry_major,
            "submitted": submitted,
            "photo_url": sub.photo_url if sub else None,
            "hometown": sub.hometown if sub else None,
            "hobbies": sub.hobbies if sub else None,
            "first_impression": sub.first_impression if sub else None,
            "submission_id": sub.id if sub else None,
            "captured_at": sub.captured_at.isoformat() if sub and sub.captured_at else None,
            "latitude": sub.latitude if sub else None,
            "longitude": sub.longitude if sub else None,
        })

    entries.sort(key=lambda e: e["nrp"])
    total = len(entries)
    if all_:
        return {
            "entries": entries,
            "total": total,
            "submitted_count": sum(1 for e in entries if e["submitted"]),
        }
    total_pages = max(1, (total + per_page - 1) // per_page)
    start = (page - 1) * per_page
    paged = entries[start:start + per_page]

    return {
        "entries": paged,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "submitted_count": sum(1 for e in entries if e["submitted"]),
    }


_NRP_MAP = {
    "5025251001": "Naura Rizky Ameira",
    "5025251002": "Muhammad Faris Alfarrel",
    "5025251004": "Ahmad Faruq Azzam",
    "5025251005": "Ahmad Farras Favian Al Efasi",
    "5025251006": "Farras Al Ghifari",
    "5025251009": "Athar Rozy Rasyidan",
    "5025251010": "Agile Octa Agrakha Handrian",
    "5025251011": "Dzulfiqar Rafi'ussunnah",
    "5025251012": "Khumaidy Syafiq El Maududy",
    "5025251013": "Nisrina Zahralilla",
    "5025251014": "Padhang Abiyu Fikri",
    "5025251015": "Renato Kiran Arisandi",
    "5025251016": "Keven John Gondowardojo",
    "5025251017": "Wafi Fawwaz Sutisna",
    "5025251018": "Farrel Marvellino Sugianto",
    "5025251019": "Fakhrian Elanta",
    "5025251020": "Firsto Al Kautsar Jagad Kurniaji",
    "5025251021": "Yahdilil Haq Sarifuddin",
    "5025251022": "Ahmad Radho Alfariz",
    "5025251023": "Chairunnisa` Tsabitah",
    "5025251024": "Rinaltra Nabasa Simanungkalit",
    "5025251025": "Elba Galuh Hardiyanti",
    "5025251027": "Hadryan Rizky Dimas Saputra",
    "5025251028": "Julianda Caesar Prakoso",
    "5025251031": "Najwan Sigit Cahya Buana",
    "5025251032": "Nagita Aliya Sanopa",
    "5025251033": "Jeremee Rafael Wynn",
    "5025251034": "Ferdyan Dimas Satria",
    "5025251035": "Aston Justin Holiwono",
    "5025251036": "Darwisy Ahmad Alfayyadl",
    "5025251037": "Hasan Mohammadi",
    "5025251038": "Jovan Steve Antony",
    "5025251039": "Benedictus Imanuel Wicaksono",
    "5025251040": "Nurmaida Intan Permadani",
    "5025251041": "Muhammad Adinata Parikesit",
    "5025251042": "Yulius Restu Putranto",
    "5025251043": "Tri Zuyyina Rohmah",
    "5025251045": "Khalisya Zahra Putria Rahman",
    "5025251046": "Muhammad Fairuz Ananta",
    "5025251047": "Akhmad Fahmi",
    "5025251048": "Rado Putra Yustisiawan",
    "5025251049": "Husna 'Akifah",
    "5025251050": "Muhammad Fajrul Hakam",
    "5025251051": "Andra Safir Gemintang",
    "5025251052": "Hilmy Fausta Pratama",
    "5025251053": "M. Haziq Ridwan Parsa",
    "5025251054": "Earlang Rangga Purwanto",
    "5025251055": "Aga Nafta Filadelfiano",
    "5025251056": "Sulthaan Daffaa'hadiansyach",
    "5025251057": "Gabriella Putri Atmaja Adi",
    "5025251058": "Shine Lee Romenzio Tarigan",
    "5025251059": "Arsya Argananta",
    "5025251060": "Sanchia Revana Koasasi",
    "5025251061": "Bayu Setyo Nugroho",
    "5025251062": "Aisyah Putri Diza",
    "5025251063": "Lina Mushlihah",
    "5025251064": "Mas Ayu Lana Afiah",
    "5025251065": "Rida Izzati Azzahra",
    "5025251066": "Nabil Khairie",
    "5025251067": "Azka Fairus Syamsa",
    "5025251068": "Satya Mahardika Sandyaditama",
    "5025251069": "Evannio Michael Christeben Putra",
    "5025251070": "Pandutama Putra Difira",
    "5025251071": "Nasywa Zhafirah",
    "5025251072": "Deborah Amalia Sheraviningrum",
    "5025251073": "Ilham Husni Pratama",
    "5025251075": "Muhammad Naufal Syahputra",
    "5025251076": "Muhammad Faqih",
    "5025251077": "Bastian Gerry Simangunsong",
    "5025251078": "Muhammad Dida Pandawa",
    "5025251079": "Isham Hawali Arijuddin",
    "5025251080": "Kevin Jonathan Messakh",
    "5025251081": "Luthfir Rizqy Fathullah Hanggi",
    "5025251082": "M. Aqsha Syadindha Putra",
    "5025251083": "Tubagus Muhamad Afif",
    "5025251084": "Radhit Akriandra",
    "5025251087": "Zakary Nareswara Tulus Sinudewangga Hatmadipura",
    "5025251088": "I Komang Bagus Alvero Wisnawa",
    "5025251089": "Nabila Zalfaa Putri Hamid",
    "5025251090": "Nailla Chrysant Jelita",
    "5025251091": "Mumtaz Hanumi Fayazida",
    "5025251092": "Dhia Hiroyuki Prawira",
    "5025251093": "Muhammad Hanif Musyafa",
    "5025251094": "I Gusti Agung Wijnana Aryasa",
    "5025251095": "Alessandro Almaz Filemon",
    "5025251096": "Gabriel Mesly Managam Siahaan",
    "5025251097": "Caroline Alverina",
    "5025251098": "Wistara Banyu Kayana",
    "5025251099": "Faris Rashid Azizi",
    "5025251100": "Yudith Hafiz Rabbani",
    "5025251101": "Ayudya Devina Azzahra",
    "5025251102": "Muhammad Ludaka Firdaus",
    "5025251103": "Rafifah Nabil Rahmadian",
    "5025251104": "Amanda Putri Chaerunnisa",
    "5025251105": "Gita Renada",
    "5025251106": "Asher Yedijah Hoesono",
    "5025251107": "Dimas Adiyaksa",
    "5025251108": "Dimas Maulana Putra",
    "5025251109": "Marveilleux Putra Mahasura",
    "5025251110": "Muhammad Fauzta Putra Kavie",
    "5025251111": "Ahmad Rafli Syarif Attallah",
    "5025251112": "Faizaturrahmah Baity",
    "5025251113": "Dewa Fitrah Fakhrusy Imron",
    "5025251114": "Sheila Alvina Tsabita",
    "5025251115": "Rayyan Aura Rahman",
    "5025251116": "Moh. Zidan Ilmi Alwi",
    "5025251117": "Faeyzar Ahnaf Musyarri",
    "5025251118": "Anang Ardhiansyah",
    "5025251120": "Alogo Hasiholan Napitupulu",
    "5025251121": "Haidar Abiyyu At Taqy",
    "5025251122": "Maida Aqillah Putri Nurandani",
    "5025251124": "Muhammad Alhady Rizq",
    "5025251125": "Muhammad Afzal Fulvian Handoni",
    "5025251126": "Budiman Setiono",
    "5025251129": "Muhammad Brahmana Priambudi",
    "5025251130": "Aziz Alfarisi",
    "5025251131": "Muhammad Azka Asyrafany",
    "5025251132": "Kyla Rahma Maulida",
    "5025251133": "Garda Putra Brahmantya",
    "5025251134": "Althea Rahmania Fitri",
    "5025251135": "Gadhiza Edgina Ikhwana Putri",
    "5025251136": "Yudhistira Eka Pratama",
    "5025251137": "Rayyan Aqsha Raditya",
    "5025251138": "Farrel Satria Mukti",
    "5025251139": "Gita Aulia",
    "5025251140": "Tristan Athala Rizqullah Al Farisi",
    "5025251141": "Muhammad Fahmi Ilmi",
    "5025251142": "Rafi Atha Maulana",
    "5025251143": "Ahmad Fakhrul Bawani",
    "5025251144": "Muhammad Raihan Ar Royyan Daryanto",
    "5025251145": "Raffa Atha Maulana",
    "5025251146": "Febrian Ananda Tjahjono",
    "5025251147": "Nicholaus Ardian Nugraha",
    "5025251148": "Rahmavida Novita Setiani",
    "5025251149": "Putu Pradipta Ananda",
    "5025251150": "Made Joshua Ama Ede",
    "5025251151": "Komang Mahatma Langendria",
    "5025251152": "Dewa Ngakan Putu Sunyananda Triyanca",
    "5025251153": "I Gede Made Adi Putra Adnyana",
    "5025251154": "Boy Steven Benaya Aritonang",
    "5025251155": "Wanhardo Jawak",
    "5025251156": "Valian Athalla Syahputra",
    "5025251158": "Aditya Lingga Mardika",
    "5025251159": "Maulana Anugra Putra",
    "5025251160": "Vania Aisha Rohmawati",
    "5025251161": "Rizqi Arya Kuskhilbyano",
    "5025251166": "Muhammad Kholid Zulfikar",
    "5025251167": "Gabriela Asima Nainggolan",
    "5025251168": "Lina Fatima Azzahra Badr",
    "5025251169": "I Gusti Agung Candra Nugraha",
    "5025251170": "Hussein Mohammad Mahsun",
    "5025251171": "Daniel Pedrosaputra",
    "5025251172": "Zainab Ammar Zahra",
    "5025251174": "Marco Marcelino",
    "5025251175": "Rafif Athalail Y",
    "5025251176": "Kevinansyah Salviano Rachmadewa",
    "5025251177": "Fathan Nurtamam Amry",
    "5025251178": "Fazli Irham Ramadhan Abdillah",
    "5025251179": "Muhammad Faiz Haq",
    "5025251181": "Chaniel Daniello Junitona Tarigan",
    "5025251182": "Yesenia Valencia Wibowo",
    "5025251183": "Aditya Hariyadi Tjtujitno",
    "5025251184": "Claresta Amelinda Hutauruk",
    "5025251185": "Muhammad Irsyad Prihasto",
    "5025251187": "Farrel Rizqi Pangestu",
    "5025251188": "Novaldi Rayhan Asshiddiqi",
    "5025251189": "Putu Dylan Pryana",
    "5025251190": "Sayyid Faiz Al Izzuddin",
    "5025251191": "Salsabila Hana Adniah",
    "5025251193": "Raihan Naufal Ramadhan",
    "5025251194": "I Nyoman Gede Anargya Sean Budhi Yasa",
    "5025251195": "Dafa Dega Wijaya",
    "5025251196": "I Dewa Gede Putra Susila",
    "5025251198": "Bryan Darrick Pangedi",
    "5025251199": "Muhammad Aqsan",
    "5025251200": "Rafi Eka Pramudya",
    "5025251201": "Fadlie Akbar Indrianto",
    "5025251202": "Fawwas Razzan Sulfi Andreyawan",
    "5025251203": "Muhammad Aqilah Arianto",
    "5025251204": "Althof Rahmatullah",
    "5025251205": "I Made Saskara Bawa",
    "5025251206": "Rexa Matutu Harsaputra",
    "5025251207": "Kezia Livina",
    "5025251208": "Rafifah Rahmah Admayana",
    "5025251209": "Marvel Timothy Noya",
    "5025251210": "Fany Haikal Ahmad",
    "5025251211": "Rizqi Ardiansyah Putra Pratama",
    "5025251212": "Joel Angga Fransmartua Manalu",
    "5025251213": "Ummi Kalsum Azzahra",
    "5025251214": "Vijvika Nala Sanuratri",
    "5025251215": "M Adhwa Athallah Tsani Anargya",
    "5025251216": "Jessica Febiola",
    "5025251217": "Syabil Zihni",
    "5025251218": "Mushallina Dzikri Rozana",
    "5025251219": "Farrel Fahrezi Rizvanala",
    "5025251221": "Rachmat Ahzadel",
    "5025251222": "I Dewa Nyoman Acarya Wibawantra",
    "5025251223": "Sayyidah Fatimah Azzahrah Rakhmatullah",
    "5025251225": "Fayyadh Ahmad Zuhri",
    "5025251226": "Grandira Haidee Alexandro Letik",
    "5025251227": "Khen Patra Yabes Sianipar",
    "5025251229": "Muhammad Raffy Adika Putra Riyanto",
    "5025251230": "Naila Hikaru",
    "5025251231": "Nichola Matthew Hutabarat",
    "5025251232": "Zidni Ammar Zadi",
    "5025251233": "I Made Bagus Naratama Karangputra",
    "5025251234": "Ahmad Fateh Eydil Faiq",
    "5025251235": "Dhanishara Zaschya Putri Syamsudin",
    "5025251236": "Gede Nararya Vatsa",
    "5025251237": "Nur Handiena Deswinda Jefrimananda",
    "5025251238": "Istaqim Makmun",
    "5025251239": "Muhammad Faza Ismail",
    "5025251240": "Medina Kusuma Prianda",
    "5025251241": "Glenn Lucky Tangke Payung",
    "5025251242": "Irsyad Ansyari Hakim",
    "5025251243": "Irsyad Akbar",
    "5025251245": "Hasna Nabila Hanim",
    "5025251246": "Hamizan Rifqi Afandi",
    "5025251247": "Gede Panji Dana Putra Ricedes",
    "5025251248": "Maulana Bagas Rizqi Pratama",
    "5025251249": "Enver Alif Wirawan",
    "5025251251": "Mochammad Raja Defana",
    "5025251252": "Matthew Adrian Putra",
    "5025251253": "Darryl Ardan Wicaksono",
    "5025251254": "Salsabila Shafadelarosa",
    "5025251255": "Aghazy Setyo Nugroho",
    "5025251257": "Rozan Hakim Abyandhono",
    "5025251258": "Naila Sa'ada Cahyani",
    "5025251259": "A. Deraya Meuthia Toja",
    "5025251260": "Aqilah Ibrahim",
    "5025251262": "Muhammad Rayza Buftiem",
    "5025251263": "Raihan Ahmad Farraszaki",
    "5025251264": "Ronald Ruben Sitopu",
    "5025251265": "Affan Rafi Habibie",
    "5025251268": "Safiya Nadira Az-Zahra",
    "5025251269": "Daffa Arya Satyatma",
    "5025251270": "Muhamad Alfareza Hariesa Pratama",
    "5025251272": "Raka Rajendra Dipo Alam",
    "5025251273": "Cokorda Bagus Laksmana Iswara",
    "5025251274": "Hafuza Riffat",
    "5053251001": "Rokhmatul Ilma Khanifa",
    "5053251002": "Selly Aisyah",
    "5053251003": "Aurelia Pradnyaswari Sanjaya Erawan",
    "5053251004": "M. Khauzaky Amkanaky",
    "5053251005": "Dheva Alvian Alfarizzy Excellent",
    "5053251006": "Aurelia Nurdiansyah Putri",
    "5053251007": "Abdul Ghofur Luqman Salim",
    "5053251008": "Sulthan Zakinun Nasywa",
    "5053251009": "Muchammad Naufal Aziz",
    "5053251011": "Achmad Mirza Arzheta Rahman",
    "5053251012": "Hilmi Taqiyuddin Haq",
    "5053251013": "Hilmi Fauzi Adha Simamora",
    "5053251014": "Muhammad Rafi Riansjah",
    "5053251015": "Hafidz Nur Ikhsan Isnaeni",
    "5053251017": "Daffa Randika",
    "5053251018": "Mhd. Ravy Enstein Wahieda Elmunif",
    "5053251019": "Muhammad Nafis Al Khalifi",
    "5053251020": "Yuwand Arteta Hydri Wahyu Putra",
    "5053251021": "Ahmad Zaidaan",
    "5053251022": "Muhammad Hanif Nasrullah",
    "5053251023": "Afrel Zharif Muflih",
    "5053251024": "Nathan Alden",
    "5053251025": "Muhammad Fakhry Ziyad Dhiyaulhaq",
    "5053251026": "Safia Rashida Raya",
    "5053251027": "Deara Briliana Putri",
    "5053251028": "Yeremia Gunawan",
    "5053251029": "Alvian Faza Wafda Reonaldi",
    "5053251030": "La Ode Muhammad Ghofaruddin S",
    "5053251031": "Muhammad Hisyam Nurdy",
    "5053251032": "Daniel Dhaniswara",
    "5053251033": "Vincent Anindito Priyamboddo",
    "5053251034": "Nabila Ainiya Rahman",
    "5053251035": "Azendra Kenar Arviant",
    "5053251036": "Farrel Aryasatya Raharjo",
    "5053251038": "Marsya Safina Maulidiyah",
    "5053251039": "Devin Faza Raditya",
    "5053251040": "Muhammad Zaydan Anugrah Pratama",
    "5053251041": "Moch Siril Wafa Zidane Feliano",
    "5053251042": "Ahmad Balya Malkan",
    "5053251043": "Muhammad Farel Al Farisi",
    "5053251044": "Fauzan Hasyim",
    "5053251045": "Dzakwan Ghonim Fath'han Mubina",
    "5053251046": "Reifan Al-Fattii Cahyadewa",
    "5053251047": "Achmad Raffi Darmawan",
    "5053251048": "Rilo Zidane Afrianta Tambunan",
    "5053251049": "Matahari Gracio Sinaga",
    "5053251050": "Reza",
    "5054251001": "Benedictus Ryu Gunawan",
    "5054251002": "Aziz Rahmad Arifin",
    "5054251003": "Firdaus Mangkona",
    "5054251004": "Muhammad Azka Ananta Khairon",
    "5054251006": "Muhammad Fasya Atthaya Rosyada",
    "5054251008": "Hilal Tsabitul Azmi Arba'i",
    "5054251009": "Pranaja Adyatma Budiman",
    "5054251010": "Rakha Makarim",
    "5054251011": "Maria Putu Evelyne Corena Puryatma",
    "5054251013": "Evina Fitriyani",
    "5054251014": "Muhammad Rafie Safaraz Barus",
    "5054251015": "Fahmi Alfayadh",
    "5054251016": "Vincent Valentino",
    "5054251017": "Rafa Rizki Aira Swala",
    "5054251018": "Dinnetza Araafya Yudetti",
    "5054251019": "Rasya Arya Ramadhan",
    "5054251020": "Sandi Suryo Nugroho",
    "5054251021": "Muhammad Fardan Hafidz",
    "5054251022": "Daffa Aufa Afif",
    "5054251023": "Zico Diego Rio Ramadhonny",
    "5054251024": "Muhammad Irzam Hafis Fabiansyah",
    "5054251025": "Rayyan Binar Ramadhan",
    "5054251026": "Jonathan Joyo Wibowo",
    "5054251027": "Faiz Farrosian Karim",
    "5054251028": "Malfino Muhammad Willianz",
    "5054251029": "Intifada Afkar Lazain Muhammad",
    "5054251030": "Raihan Nurhakim",
    "5054251032": "Rasya Gonawi",
    "5054251033": "Levina Zahrathul Huda",
    "5054251036": "Prima Surya Nusantara",
    "5054251037": "Lioneil Diyoel Trystan Tikupadang",
    "5054251039": "Muhammad Dzaky Haidar",
    "5054251035": "Fauzan Tamma Harish Kunfaza",
    "5054251041": "Maulana Rhys Pradana",
    "5054251042": "Muhammad Farid Wijdan",
    "5054251044": "Ahmad Zaki Fauzan Nabil",
    "5054251045": "Mahardika Indra Pratama Ilyasa",
    "5054251046": "Suhail Ainur Rofiq",
    "5054251047": "A. Toriq Azhar",
    "5054251048": "Sulaiman Faiz Tsaqib",
    "5054251050": "Kadek Nathania Gavrila Astika",
    "5054251051": "Rayyan Muhtar Ali",
}


def find_name_from_nrp(nrp: str) -> str:
    return _NRP_MAP.get(nrp, "Unknown")
