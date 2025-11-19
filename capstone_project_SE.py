import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import sqlite3
from datetime import datetime, date
import os
import numpy as np
import csv

# Optional imports for QR functionality
try:
    import qrcode
    from PIL import Image, ImageTk
    import cv2
    from pyzbar import pyzbar
    QR_AVAILABLE = True
except Exception:
    QR_AVAILABLE = False
    print("QR features disabled. Install: pip install qrcode[pil] opencv-python pyzbar pillow")


class CollegeGateScanner:
    def __init__(self, root):
        try:
            self.root = root
            self.root.title("College Gate ID Scanner System with QR")
            self.root.geometry("1200x750")
            self.root.configure(bg="#1a1a2e")

            # Initialize database first
            self.init_database()

            # Current date
            self.current_date = date.today()

            # QR Scanner variables
            self.qr_scanner_active = False
            self.camera = None
            self.last_qr_scan_time = 0  # Add this line to track last QR scan time

            # Create UI
            self.create_widgets()

            # Auto-refresh timer
            self.auto_refresh()

            # Ensure graceful shutdown
            self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        except Exception as e:
            messagebox.showerror("Initialization Error", f"Failed to initialize application: {str(e)}")
            raise

    def init_database(self):
        """Initialize SQLite database"""
        try:
            # Create database directory if it doesn't exist
            db_dir = os.path.dirname('college_gate_scanner.db')
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir)

            self.conn = sqlite3.connect('college_gate_scanner.db')
            self.cursor = self.conn.cursor()

            # Students master table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS students (
                    student_id TEXT PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    department TEXT,
                    year TEXT,
                    phone TEXT,
                    email TEXT,
                    photo_path TEXT,
                    qr_code_path TEXT,
                    status TEXT DEFAULT 'Active',
                    registered_date TEXT
                )
            ''')

            # Entry/Exit logs table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS gate_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    student_name TEXT,
                    entry_time TEXT,
                    exit_time TEXT,
                    log_date TEXT,
                    duration TEXT,
                    scan_method TEXT,
                    notes TEXT,
                    FOREIGN KEY (student_id) REFERENCES students(student_id)
                )
            ''')

            # Daily attendance summary
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS daily_summary (
                    summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    log_date TEXT,
                    total_entries INTEGER,
                    total_exits INTEGER,
                    currently_inside INTEGER,
                    last_updated TEXT
                )
            ''')

            self.conn.commit()

            # Add this line after creating tables
            self.add_missing_columns()

        except sqlite3.Error as e:
            messagebox.showerror("Database Error", f"Failed to initialize database: {str(e)}")
            raise
        except Exception as e:
            messagebox.showerror("Error", f"An unexpected error occurred: {str(e)}")
            raise

    def add_missing_columns(self):
        """Add missing columns to existing tables"""
        try:
            # Check if qr_code_path column exists
            self.cursor.execute("PRAGMA table_info(students)")
            columns = [column[1] for column in self.cursor.fetchall()]

            if 'qr_code_path' not in columns:
                self.cursor.execute('''
                    ALTER TABLE students
                    ADD COLUMN qr_code_path TEXT
                ''')
                self.conn.commit()
                print("Added qr_code_path column to students table")

        except sqlite3.Error as e:
            messagebox.showerror("Database Error", f"Failed to add columns: {str(e)}")
            raise

    def create_widgets(self):
        """Create all UI widgets"""
        # Header
        header_frame = tk.Frame(self.root, bg="#0f3460", height=80)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)

        tk.Label(header_frame, text="🎓 COLLEGE GATE SCANNER WITH QR",
                 font=("Arial", 24, "bold"), bg="#0f3460", fg="#e94560").pack(pady=10)

        time_frame = tk.Frame(header_frame, bg="#0f3460")
        time_frame.pack()

        self.time_label = tk.Label(time_frame, text="", font=("Arial", 12),
                                   bg="#0f3460", fg="white")
        self.time_label.pack()
        self.update_time()

        # Main container
        main_container = tk.Frame(self.root, bg="#1a1a2e")
        main_container.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)

        # Left Panel - Scanner
        left_panel = tk.Frame(main_container, bg="#16213e", relief=tk.RAISED, bd=2)
        left_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        # Scanner Section
        scanner_frame = tk.LabelFrame(left_panel, text="SCAN STUDENT ID",
                                      font=("Arial", 14, "bold"), bg="#16213e",
                                      fg="#e94560", padx=20, pady=20)
        scanner_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # QR Scanner Toggle (only if available)
        if QR_AVAILABLE:
            qr_control_frame = tk.Frame(scanner_frame, bg="#16213e")
            qr_control_frame.pack(pady=10)

            self.qr_toggle_btn = tk.Button(qr_control_frame, text="📷 Start QR Scanner",
                                           command=self.toggle_qr_scanner,
                                           font=("Arial", 12, "bold"),
                                           bg="#27ae60", fg="white", cursor="hand2",
                                           width=20)
            self.qr_toggle_btn.pack()

            # QR Camera preview - Make it larger (height increased)
            self.qr_preview_label = tk.Label(
                scanner_frame, bg="#0f3460",
                text="QR Scanner Off",
                font=("Arial", 10), fg="white",
                width=150, height=80  # Make preview area even larger
            )
            self.qr_preview_label.pack(pady=5, expand=True, fill=tk.BOTH)

            # Make other elements more compact
            tk.Label(scanner_frame, text="OR", font=("Arial", 10),
                    bg="#16213e", fg="#00d9ff").pack(pady=2)  # Reduced padding

            # Manual Entry - More compact
            tk.Label(scanner_frame, text="Manual ID Entry:",
                    font=("Arial", 10), bg="#16213e", fg="white").pack(pady=2)

            self.scan_entry = tk.Entry(scanner_frame, font=("Arial", 12),  # Reduced font size
                                   justify="center", width=15, bg="#0f3460",
                                   fg="white", insertbackground="white")
            self.scan_entry.pack(pady=2, ipady=4)  # Reduced padding

            # Scan button - More compact
            tk.Button(scanner_frame, text="🔍 SCAN",  # Shortened text
                  command=lambda: self.process_scan("manual"),
                  font=("Arial", 11),  # Reduced font size
                  bg="#e94560", fg="white", cursor="hand2",
                  height=1, width=15).pack(pady=2)  # Reduced size

            # Student Info Display - More compact
            info_frame = tk.LabelFrame(scanner_frame, text="Info",  # Shortened text
                                   font=("Arial", 10), bg="#16213e",
                                   fg="#00d9ff", padx=5, pady=5)  # Reduced padding
            info_frame.pack(fill=tk.X, pady=2)  # Changed to X fill only

            self.info_text = tk.Text(info_frame, height=4, width=30,  # Reduced height
                             font=("Arial", 9), bg="#0f3460", fg="white",
                             state="disabled", relief=tk.FLAT)
            self.info_text.pack(fill=tk.X)  # Changed to X fill only

        else:
            tk.Label(scanner_frame, text="⚠️ QR Scanner Not Available",
                    font=("Arial", 10, "italic"), bg="#16213e",
                    fg="orange").pack(pady=5)

        # Quick Stats
        stats_frame = tk.LabelFrame(left_panel, text="TODAY'S STATISTICS",
                                    font=("Arial", 12, "bold"), bg="#16213e",
                                    fg="#e94560", padx=15, pady=15)
        stats_frame.pack(fill=tk.X, padx=10, pady=(0, 10))

        stats_container = tk.Frame(stats_frame, bg="#16213e")
        stats_container.pack()

        self.stats_labels = {}
        stats = [("Total Entries", "entries"), ("Total Exits", "exits"),
                 ("Currently Inside", "inside")]

        for idx, (label, key) in enumerate(stats):
            frame = tk.Frame(stats_container, bg="#0f3460", relief=tk.RAISED, bd=2)
            frame.grid(row=0, column=idx, padx=5, pady=5, ipadx=10, ipady=5)

            tk.Label(frame, text=label, font=("Arial", 9),
                    bg="#0f3460", fg="#00d9ff").pack()
            self.stats_labels[key] = tk.Label(frame, text="0",
                                             font=("Arial", 18, "bold"),
                                             bg="#0f3460", fg="white")
            self.stats_labels[key].pack()

        # Right Panel - Logs and Management
        right_panel = tk.Frame(main_container, bg="#16213e", relief=tk.RAISED, bd=2)
        right_panel.grid(row=0, column=1, sticky="nsew", padx=(10, 0))

        # Notebook for tabs
        notebook = ttk.Notebook(right_panel)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Tab 1: Today's Logs
        logs_tab = tk.Frame(notebook, bg="#16213e")
        notebook.add(logs_tab, text="📋 Today's Logs")

        # Search frame
        search_frame = tk.Frame(logs_tab, bg="#16213e")
        search_frame.pack(fill=tk.X, padx=10, pady=10)

        tk.Label(search_frame, text="Search:", font=("Arial", 10),
                bg="#16213e", fg="white").pack(side=tk.LEFT, padx=5)

        self.log_search = tk.Entry(search_frame, font=("Arial", 10), width=25,
                                   bg="#0f3460", fg="white", insertbackground="white")
        self.log_search.pack(side=tk.LEFT, padx=5)
        self.log_search.bind("<KeyRelease>", lambda e: self.search_logs())

        tk.Button(search_frame, text="🔄 Refresh", command=self.load_today_logs,
                 bg="#00d9ff", fg="black", font=("Arial", 9, "bold"),
                 cursor="hand2").pack(side=tk.LEFT, padx=5)

        # Logs treeview
        tree_frame = tk.Frame(logs_tab, bg="#16213e")
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))

        scrollbar = tk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.logs_tree = ttk.Treeview(tree_frame, columns=("ID", "Name", "Entry", "Exit", "Status", "Method"),
                                     show="headings", height=15, yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.logs_tree.yview)

        self.logs_tree.heading("ID", text="Student ID")
        self.logs_tree.heading("Name", text="Name")
        self.logs_tree.heading("Entry", text="Entry Time")
        self.logs_tree.heading("Exit", text="Exit Time")
        self.logs_tree.heading("Status", text="Status")
        self.logs_tree.heading("Method", text="Method")

        self.logs_tree.column("ID", width=90)
        self.logs_tree.column("Name", width=150)
        self.logs_tree.column("Entry", width=90)
        self.logs_tree.column("Exit", width=90)
        self.logs_tree.column("Status", width=80)
        self.logs_tree.column("Method", width=70)

        self.logs_tree.pack(fill=tk.BOTH, expand=True)

        # Delete All Logs button
        self.delete_logs_btn = tk.Button(
            logs_tab,
            text="🗑️ Delete All Logs",
            command=self.delete_all_logs,
            bg="#e74c3c", fg="white",
            font=("Arial", 10, "bold"),
            cursor="hand2"
        )
        self.delete_logs_btn.pack(pady=5)

        # Tab 2: Student Management
        students_tab = tk.Frame(notebook, bg="#16213e")
        notebook.add(students_tab, text="👥 Student Management")

        # Add student form
        form_frame = tk.LabelFrame(students_tab, text="Register New Student",
                                   font=("Arial", 11, "bold"), bg="#16213e",
                                   fg="#00d9ff", padx=15, pady=15)
        form_frame.pack(fill=tk.X, padx=10, pady=10)

        fields_frame = tk.Frame(form_frame, bg="#16213e")
        fields_frame.pack()

        # Student registration fields
        self.student_entries = {}
        student_fields = [
            ("Student ID:", "id"),
            ("Full Name:", "name"),
            ("Department:", "dept"),
            ("Year:", "year"),
            ("Phone:", "phone"),
            ("Email:", "email")
        ]

        for idx, (label, key) in enumerate(student_fields):
            row = idx // 2
            col = (idx % 2) * 2

            tk.Label(fields_frame, text=label, bg="#16213e",
                    fg="white", font=("Arial", 9)).grid(row=row, column=col,
                                                        sticky="w", padx=5, pady=5)
            entry = tk.Entry(fields_frame, width=20, font=("Arial", 9),
                           bg="#0f3460", fg="white", insertbackground="white")
            entry.grid(row=row, column=col+1, padx=5, pady=5)
            self.student_entries[key] = entry

        # Buttons
        btn_frame = tk.Frame(form_frame, bg="#16213e")
        btn_frame.pack(pady=10)

        btn_text = "➕ Register & Generate QR" if QR_AVAILABLE else "➕ Register Student"
        tk.Button(btn_frame, text=btn_text,
                 command=self.register_student, bg="#27ae60", fg="white",
                 font=("Arial", 10, "bold"), cursor="hand2").pack(side=tk.LEFT, padx=5)

        tk.Button(btn_frame, text="🗑️ Clear Form",
                 command=self.clear_student_form, bg="#e74c3c", fg="white",
                 font=("Arial", 10, "bold"), cursor="hand2").pack(side=tk.LEFT, padx=5)

        # --- Add these two buttons ---
        tk.Button(btn_frame, text="✏️ Edit Student",
                 command=self.edit_student, bg="#f1c40f", fg="black",
                 font=("Arial", 10, "bold"), cursor="hand2").pack(side=tk.LEFT, padx=5)

        tk.Button(btn_frame, text="❌ Delete Student",
                 command=self.delete_student, bg="#c0392b", fg="white",
                 font=("Arial", 10, "bold"), cursor="hand2").pack(side=tk.LEFT, padx=5)

        # Students list
        list_frame = tk.LabelFrame(students_tab, text="Registered Students",
                                   font=("Arial", 11, "bold"), bg="#16213e",
                                   fg="#00d9ff", padx=10, pady=10)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        student_tree_frame = tk.Frame(list_frame, bg="#16213e")
        student_tree_frame.pack(fill=tk.BOTH, expand=True)

        student_scroll = tk.Scrollbar(student_tree_frame)
        student_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.students_tree = ttk.Treeview(student_tree_frame,
                                         columns=("ID", "Name", "Dept", "Year", "Status"),
                                         show="headings", height=8,
                                         yscrollcommand=student_scroll.set)
        student_scroll.config(command=self.students_tree.yview)

        for col in ["ID", "Name", "Dept", "Year", "Status"]:
            self.students_tree.heading(col, text=col)
            self.students_tree.column(col, width=120)

        self.students_tree.pack(fill=tk.BOTH, expand=True)

        if QR_AVAILABLE:
            self.students_tree.bind("<Double-Button-1>", self.view_student_qr)
            tk.Label(students_tab, text="💡 Double-click a student to view/download QR code",
                    font=("Arial", 9, "italic"), bg="#16213e", fg="#00d9ff").pack(pady=5)

            # --- Add this block for the View QR Code button ---
            self.view_qr_btn = tk.Button(
                students_tab,
                text="🔍 View QR Code",
                command=self.view_selected_student_qr,
                bg="#00d9ff", fg="black",
                font=("Arial", 10, "bold"),
                cursor="hand2"
            )
            self.view_qr_btn.pack(pady=5)

        # Tab 3: Reports
        reports_tab = tk.Frame(notebook, bg="#16213e")
        notebook.add(reports_tab, text="📊 Reports")
        tk.Label(reports_tab, text="Export Reports", font=("Arial", 14, "bold"),
                bg="#16213e", fg="#e94560").pack(pady=20)

        report_buttons = [
            ("Export Today's Logs", self.export_today_logs),
            ("Export All Students", self.export_students),
            ("Export Monthly Report", self.export_monthly_report)
        ]
        for text, command in report_buttons:
            tk.Button(reports_tab, text=text, command=command,
                     bg="#00d9ff", fg="black", font=("Arial", 11, "bold"),
                     width=25, height=2, cursor="hand2").pack(pady=10)

        # Configure grid weights
        main_container.columnconfigure(0, weight=2)
        main_container.columnconfigure(1, weight=3)
        main_container.rowconfigure(0, weight=1)

        # Initial data load
        self.load_today_logs()
        self.load_students()
        self.update_stats()

    def toggle_qr_scanner(self):
        """Toggle QR code scanner on/off"""
        if not QR_AVAILABLE:
            messagebox.showerror("Error", "QR libraries not installed!")
            return
        if not self.qr_scanner_active:
            self.start_qr_scanner()
        else:
            self.stop_qr_scanner()

    def start_qr_scanner(self):
        """Start the QR code scanner"""
        try:
            self.camera = cv2.VideoCapture(0)
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            if not self.camera.isOpened():
                messagebox.showerror("Error", "Could not access camera!")
                return
            self.qr_scanner_active = True
            self.qr_toggle_btn.config(text="⏹️ Stop QR Scanner", bg="#e74c3c")
            self.scan_qr_code()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start camera: {str(e)}")
            self.qr_scanner_active = False

    def stop_qr_scanner(self):
        """Stop the QR code scanner"""
        self.qr_scanner_active = False
        if self.camera:
            try:
                self.camera.release()
            except Exception:
                pass
            self.camera = None
        if hasattr(self, 'qr_toggle_btn'):
            self.qr_toggle_btn.config(text="📷 Start QR Scanner", bg="#27ae60")
        if hasattr(self, 'qr_preview_label'):
            self.qr_preview_label.config(image="", text="QR Scanner Off")

    def scan_qr_code(self):
        """Continuously scan for QR codes"""
        if not self.qr_scanner_active or not self.camera:
            return

        import time
        def process_frame(frame):
            print("Processing frame...")  # Debug
            decoded_objects = pyzbar.decode(frame)
            print(f"Decoded objects: {decoded_objects}")  # Debug
            for obj in decoded_objects:
                try:
                    student_id = obj.data.decode('utf-8')
                    now = time.time()
                    if now - self.last_qr_scan_time >= 3:
                        self.last_qr_scan_time = now
                        print(f"QR Code detected: {student_id}")
                        self.root.after(1, lambda sid=student_id: self.process_scan_from_qr(sid))
                    points = obj.polygon
                    if len(points) > 4:
                        hull = cv2.convexHull(points)
                        cv2.polylines(frame, [hull], True, (0, 255, 0), 3)
                    else:
                        pts = [(p.x, p.y) for p in points]
                        cv2.polylines(frame, [np.array(pts, dtype=np.int32)], True, (0, 255, 0), 3)
                except Exception as e:
                    print(f"Error processing QR code: {str(e)}")
                    continue
            try:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame = cv2.resize(frame, (900, 700))
                img = Image.fromarray(frame)
                imgtk = ImageTk.PhotoImage(image=img)
                self.qr_preview_label.imgtk = imgtk
                self.qr_preview_label.config(image=imgtk, text="")
            except Exception as e:
                print(f"Error displaying frame: {str(e)}")
        if self.qr_scanner_active:
            ret, frame = self.camera.read()
            print(f"Camera read: {ret}")  # Debug
            if ret:
                process_frame(frame)
            else:
                print("Failed to read frame from camera.")
        self.root.after(10, self.scan_qr_code)

    def process_scan_from_qr(self, student_id):
        """Process scan from QR code"""
        try:
            print(f"Processing QR scan for student ID: {student_id}")
            
            # Update entry field with scanned ID
            self.scan_entry.delete(0, tk.END)
            self.scan_entry.insert(0, student_id)
            print(f"Processing QR scan for student ID: {student_id}")
            # Lookup student info
            self.cursor.execute('''
                SELECT student_id, full_name, department, year, status 
                FROM students 
                WHERE student_id = ?
            ''', (student_id,))
            student = self.cursor.fetchone()
            if student:
                # Update info display
                self.info_text.config(state="normal")
                self.info_text.delete(1.0, tk.END)
                self.info_text.insert(tk.END, 
                    f"ID: {student[0]}\n"
                    f"Name: {student[1]}\n"
                    f"Dept: {student[2]}\n"
                    f"Year: {student[3]}")
                self.info_text.config(state="disabled")
                # Process entry/exit
                self.process_scan("QR")
            else:
                messagebox.showwarning("Not Found", 
                    "Student ID not found in database!")
                self.process_scan("QR")
        except Exception as e:
            print(f"Error in process_scan_from_qr: {str(e)}")
            messagebox.showerror("Error", f"Failed to process QR scan: {str(e)}")
            
    def process_scan(self, scan_method):
        """Process a student scan for entry/exit"""
        try:
            student_id = self.scan_entry.get().strip()
            if not student_id:
                messagebox.showwarning("Invalid", "Please enter a student ID")
                return
            current_time = datetime.now().strftime("%H:%M:%S")
            today = date.today().strftime("%Y-%m-%d")
            self.cursor.execute('''
                SELECT log_id, entry_time, exit_time
                FROM gate_logs 
                WHERE student_id = ? AND log_date = ? AND exit_time IS NULL
            ''', (student_id, today))
            existing_entry = self.cursor.fetchone()
            if existing_entry:
                # Process exit
                self.cursor.execute('''
                    UPDATE gate_logs 
                    SET exit_time = ?, scan_method = ?
                    WHERE log_id = ?
                ''', (current_time, scan_method, existing_entry[0]))
            else:
                # Process entry
                self.cursor.execute('''
                    INSERT INTO gate_logs 
                    (student_id, entry_time, log_date, scan_method)
                    VALUES (?, ?, ?, ?)
                ''', (student_id, current_time, today, scan_method))
            self.conn.commit()
            self.load_today_logs()
            self.update_stats()
            self.scan_entry.delete(0, tk.END)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to process scan: {str(e)}")
            self.update_stats()
    def update_time(self):
        """Update current time display accurately every second"""
        now = datetime.now()
        current_time = now.strftime("%d-%m-%Y %H:%M:%S")
        self.time_label.config(text=current_time)
        # Schedule next update at the start of the next second
        delay = 1000 - (now.microsecond // 1000)
        self.root.after(delay, self.update_time)
    def auto_refresh(self):
        """Auto refresh logs and stats every 30 seconds"""
        self.load_today_logs()
        self.update_stats()
        self.root.after(30000, self.auto_refresh)
    def load_today_logs(self):
        """Load today's entry/exit logs"""
        try:
            today = date.today().strftime("%Y-%m-%d")
            self.cursor.execute('''
                SELECT gl.student_id, s.full_name, gl.entry_time, gl.exit_time, gl.scan_method
                FROM gate_logs gl
                LEFT JOIN students s ON gl.student_id = s.student_id
                WHERE gl.log_date = ?
                ORDER BY gl.entry_time DESC
            ''', (today,))
            logs = self.cursor.fetchall()
            self.logs_tree.delete(*self.logs_tree.get_children())
            for log in logs:
                status = "Inside" if log[3] is None else "Left"
                self.logs_tree.insert("", "end", values=(log[0], log[1], log[2], log[3] or "", status, log[4]))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load logs: {str(e)}")
    def load_students(self):
        """Load registered students"""
        try:
            self.cursor.execute('''
                SELECT student_id, full_name, department, year, phone, email, status
                FROM students
                ORDER BY student_id
            ''')
            students = self.cursor.fetchall()
            self.students_tree.delete(*self.students_tree.get_children())
            for student in students:
                self.students_tree.insert("", "end", values=student)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load students: {str(e)}")
            
    def update_stats(self):
        """Update today's statistics"""
        try:
            today = date.today().strftime("%Y-%m-%d")
            # Get total entries
            self.cursor.execute('''
                SELECT COUNT(*) FROM gate_logs
                WHERE log_date = ?
            ''', (today,))
            total_entries = self.cursor.fetchone()[0]
            # Get total exits
            self.cursor.execute('''
                SELECT COUNT(*) FROM gate_logs
                WHERE log_date = ? AND exit_time IS NOT NULL
            ''', (today,))
            total_exits = self.cursor.fetchone()[0]
            # Calculate currently inside
            currently_inside = total_entries - total_exits
            # Update labels
            self.stats_labels["entries"].config(text=str(total_entries))
            self.stats_labels["exits"].config(text=str(total_exits))
            self.stats_labels["inside"].config(text=str(currently_inside))
        except Exception as e:
            messagebox.showerror("Error", f"Failed to update stats: {str(e)}")
            self.stats_labels["exits"].config(text=str(total_exits))
    def register_student(self):
        """Register a new student"""
        try:
            student_data = {key: entry.get().strip() for key, entry in self.student_entries.items()}
            
            if not all([student_data["id"], student_data["name"]]):
                messagebox.showwarning("Invalid", "Student ID and Name are required!")
                return
            student_data = {key: entry.get().strip() for key, entry in self.student_entries.items()}
            # Generate QR code if available
            qr_path = None
            if QR_AVAILABLE:
                qr_path = f"qr_codes/{student_data['id']}.png"
                os.makedirs("qr_codes", exist_ok=True)
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(student_data['id'])
                qr.make(fit=True)
                qr.make_image(fill_color="black", back_color="white").save(qr_path)
                os.makedirs("qr_codes", exist_ok=True)
            self.cursor.execute('''
                INSERT INTO students (student_id, full_name, department, year,
                                    phone, email, qr_code_path, registered_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (student_data["id"], student_data["name"], student_data["dept"],
                 student_data["year"], student_data["phone"], student_data["email"],
                 qr_path, datetime.now().strftime("%Y-%m-%d")))
            self.conn.commit()
            self.load_students()
            self.clear_student_form()
            messagebox.showinfo("Success", "Student registered successfully!")
            
        except sqlite3.IntegrityError:
            messagebox.showerror("Error", "Student ID already exists!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to register student: {str(e)}")
            
    def clear_student_form(self):
        """Clear student registration form and restore Register button."""
        for entry in self.student_entries.values():
            entry.config(state="normal")
            entry.delete(0, tk.END)
        # Restore Register button if it was changed to Update
        for widget in self.student_entries["id"].master.master.winfo_children():
            if isinstance(widget, tk.Button) and "Update" in widget.cget("text"):
                widget.config(text="➕ Register & Generate QR" if QR_AVAILABLE else "➕ Register Student",
                              command=self.register_student)

    def search_logs(self):
        """Search through today's logs"""
        search_text = self.log_search.get().strip().lower()
        self.load_today_logs()  # Reload all logs
        if search_text:
            for item in self.logs_tree.get_children():
                values = [str(v).lower() for v in self.logs_tree.item(item)['values']]
                if not any(search_text in v for v in values):
                    self.logs_tree.delete(item)
    def view_student_qr(self, event):
        """View and optionally download student's QR code"""
        selected = self.students_tree.selection()
        if not selected:
            return
        student_id = self.students_tree.item(selected[0])['values'][0]
        qr_path = f"qr_codes/{student_id}.png"
        if os.path.exists(qr_path):
            img = Image.open(qr_path)
            img.show()
        else:
            messagebox.showinfo("QR Code", "QR code not found. Try re-registering the student.")
    def view_selected_student_qr(self):
        """View QR code for the selected student in the list."""
        selected = self.students_tree.selection()
        if not selected:
            messagebox.showinfo("QR Code", "Please select a student first.")
            return
        student_id = self.students_tree.item(selected[0])['values'][0]
        qr_path = f"qr_codes/{student_id}.png"
        if os.path.exists(qr_path):
            img = Image.open(qr_path)
            img.show()
        else:
            messagebox.showinfo("QR Code", "QR code not found. Try re-registering the student.")
    def export_today_logs(self):
        """Export today's logs to CSV"""
        try:
            filename = filedialog.asksaveasfilename(defaultextension=".csv",
                filetypes=[("CSV files", "*.csv")],
                initialfile=f"gate_logs_{date.today().strftime('%Y%m%d')}.csv"
            )
            if filename:
                today = date.today().strftime("%Y-%m-%d")
                self.cursor.execute('''
                    SELECT gl.student_id, s.full_name, gl.entry_time, gl.exit_time,
                           gl.scan_method, gl.notes
                    FROM gate_logs gl
                    LEFT JOIN students s ON gl.student_id = s.student_id
                    WHERE gl.log_date = ?
                ''', (today,))
                with open(filename, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(["Student ID", "Name", "Entry Time", "Exit Time", "Method", "Notes"])
                    writer.writerows(self.cursor.fetchall())
                    
                messagebox.showinfo("Success", "Logs exported successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export logs: {str(e)}")
    def export_students(self):
        """Export all students to CSV"""
        try:
            filename = filedialog.asksaveasfilename(defaultextension=".csv",
                filetypes=[("CSV files", "*.csv")],
                initialfile="all_students.csv"
            )
            if filename:
                self.cursor.execute('''
                    SELECT student_id, full_name, department, year, phone, email, status
                    FROM students
                    ORDER BY student_id
                ''')
                with open(filename, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(["Student ID", "Name", "Department", "Year", "Phone", "Email", "Status"])
                    writer.writerows(self.cursor.fetchall())
                    
                messagebox.showinfo("Success", "Students list exported successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export students: {str(e)}")
    def export_monthly_report(self):
        """Export monthly attendance report"""
        try:
            filename = filedialog.asksaveasfilename(defaultextension=".csv",
                filetypes=[("CSV files", "*.csv")],
                initialfile=f"monthly_report_{datetime.now().strftime('%Y%m')}.csv"
            )
            if filename:
                month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
                self.cursor.execute('''
                    SELECT gl.log_date, COUNT(DISTINCT gl.student_id) as total_students,
                           COUNT(*) as total_entries
                    FROM gate_logs gl
                    WHERE gl.log_date >= ?
                    GROUP BY gl.log_date
                    ORDER BY gl.log_date
                ''', (month_start,))
                with open(filename, 'w', newline='') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(["Date", "Total Students", "Total Entries"])
                    writer.writerows(self.cursor.fetchall())
                    
                messagebox.showinfo("Success", "Monthly report exported successfully!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to export report: {str(e)}")
    def delete_all_logs(self):
        """Delete all logs from the gate_logs table after confirmation."""
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete all logs? This action cannot be undone."):
            try:
                self.cursor.execute("DELETE FROM gate_logs")
                self.conn.commit()
                self.load_today_logs()
                self.update_stats()
                messagebox.showinfo("Success", "All logs have been deleted.")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete logs: {str(e)}")
                self.load_today_logs()
    def on_closing(self):
        """Clean up resources before closing"""
        if self.camera:
            self.stop_qr_scanner()
        if self.conn:
            self.conn.close()
        self.root.destroy()

    def edit_student(self):
        """Load selected student's info into the form for editing."""
        selected = self.students_tree.selection()
        if not selected:
            messagebox.showinfo("Edit Student", "Please select a student to edit.")
            return
        values = self.students_tree.item(selected[0])['values']
        # Map values to form fields
        self.student_entries["id"].delete(0, tk.END)
        self.student_entries["id"].insert(0, values[0])
        self.student_entries["name"].delete(0, tk.END)
        self.student_entries["name"].insert(0, values[1])
        self.student_entries["dept"].delete(0, tk.END)
        self.student_entries["dept"].insert(0, values[2])
        self.student_entries["year"].delete(0, tk.END)
        self.student_entries["year"].insert(0, values[3])
        self.student_entries["phone"].delete(0, tk.END)
        self.student_entries["phone"].insert(0, values[4])
        self.student_entries["email"].delete(0, tk.END)
        self.student_entries["email"].insert(0, values[5])

        # Disable editing of Student ID (primary key)
        self.student_entries["id"].config(state="disabled")

        # Change Register button to Update
        for widget in self.student_entries["id"].master.master.winfo_children():
            if isinstance(widget, tk.Button) and "Register" in widget.cget("text"):
                widget.config(text="💾 Update Student", command=self.update_student)

    def update_student(self):
        """Update student info in the database."""
        try:
            student_data = {key: entry.get().strip() for key, entry in self.student_entries.items()}
            if not all([student_data["id"], student_data["name"]]):
                messagebox.showwarning("Invalid", "Student ID and Name are required!")
                return
            self.cursor.execute('''
                UPDATE students
                SET full_name=?, department=?, year=?, phone=?, email=?
                WHERE student_id=?
            ''', (student_data["name"], student_data["dept"], student_data["year"],
                  student_data["phone"], student_data["email"], student_data["id"]))
            self.conn.commit()
            self.load_students()
            self.clear_student_form()
            messagebox.showinfo("Success", "Student information updated!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to update student: {str(e)}")

    def delete_student(self):
        """Delete selected student from the database."""
        selected = self.students_tree.selection()
        if not selected:
            messagebox.showinfo("Delete Student", "Please select a student to delete.")
            return
        student_id = self.students_tree.item(selected[0])['values'][0]
        if messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete student {student_id}?"):
            try:
                self.cursor.execute("DELETE FROM students WHERE student_id=?", (student_id,))
                self.conn.commit()
                self.load_students()
                self.clear_student_form()
                messagebox.showinfo("Success", "Student deleted!")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to delete student: {str(e)}")
                

if __name__ == "__main__":
    root = tk.Tk()
    app = CollegeGateScanner(root)
    root.mainloop()