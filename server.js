const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const errorHandler = require("errorhandler");

const app = express();
const PORT = process.env.PORT || 4000;

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(
  process.env.TEST_DATABASE || "./database.sqlite"
);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(errorHandler());

app.get("/api/employees", (req, res, next) => {
  const sql = `SELECT * FROM Employee WHERE is_current_employee = 1;`;
  db.all(sql, (err, rows) => {
    if (err) {
      return next(err);
    }
    res.json({ employees: rows }).status(200);
  });
});

app.post("/api/employees", (req, res, next) => {
  const { name, position, wage } = req.body.employee;
  if (!name || !position || !wage) {
    return res.status(400).json({
      error: "Please provide name, position, and wage",
    });
  }
  const sql = `INSERT INTO Employee (name, position, wage, is_current_employee) VALUES (?, ?, ?, 1)`;

  db.run(sql, [name, position, wage], function (err) {
    if (err) {
      return next(err);
    }
    console.log(`A row has been inserted with rowid ${this.lastID}`);

    db.get(
      `SELECT * FROM Employee WHERE id = ?`,
      [this.lastID],
      (err, newEmployee) => {
        if (err) {
          return next(err);
        }
        res.status(201).json({ employee: newEmployee });
      }
    );
  });
});

app.param("employeeId", (req, res, next, id) => {
  const sql = `SELECT * FROM Employee WHERE id =?`;
  db.get(sql, [id], (err, employee) => {
    if (err) {
      return next(err);
    }
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    req.employee = employee;
    next();
  });
});

app.get("/api/employees/:employeeId", (req, res) => {
  res.json({ employee: req.employee }).status(200);
});

app.put("/api/employees/:employeeId", (req, res, next) => {
  const { name, position, wage } = req.body.employee;
  if (!name || !position || !wage) {
    return res.status(400).json({
      error: "Please provide name, position, and wage",
    });
  }
  const sql = `UPDATE Employee SET name =?, position =?, wage =? WHERE id =?`;
  db.run(sql, [name, position, wage, req.employee.id], (err) => {
    if (err) {
      return next(err);
    }
    db.get(
      `SELECT * FROM Employee WHERE id = ?`,
      [req.employee.id],
      (err, employee) => {
        if (err) {
          return next(err);
        }
        res.status(200).json({ employee: employee });
      }
    );
  });
});

app.delete("/api/employees/:employeeId", (req, res, next) => {
  const sql = `UPDATE Employee SET is_current_employee = 0 WHERE id =?`;
  db.run(sql, [req.employee.id], (err) => {
    if (err) {
      return next(err);
    }
    db.get(
      `SELECT * FROM Employee WHERE id = ?`,
      [req.employee.id],
      (err, employee) => {
        if (err) {
          return next(err);
        }
        res.status(200).json({ employee: employee });
      }
    );
  });
});

app.get("/api/employees/:employeeId/timesheets", (req, res, next) => {
  const sql = `SELECT * FROM Timesheet WHERE employee_id =?`;
  db.all(sql, [req.employee.id], (err, timesheets) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ timesheets: timesheets });
  });
});

app.post("/api/employees/:employeeId/timesheets", (req, res, next) => {
  const { hours, rate, date } = req.body.timesheet;
  if (!hours || !rate || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const sql = `INSERT INTO Timesheet (employee_id, hours, rate, date) VALUES (?,?,?,?)`;
  db.run(sql, [req.employee.id, hours, rate, date], (err) => {
    if (err) {
      return next(err);
    }
    db.get(
      `SELECT * FROM Timesheet WHERE employee_id =? AND date =?`,
      [req.employee.id, date],
      (err, timesheet) => {
        if (err) {
          return next(err);
        }
        res.status(201).json({ timesheet: timesheet });
      }
    );
  });
});

app.param("timesheetId", (req, res, next, timesheetId) => {
  const sql = `SELECT * FROM Timesheet WHERE id =?`;
  db.get(sql, [timesheetId], (err, timesheet) => {
    if (err) {
      return next(err);
    }
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet not found" });
    }
    req.timesheet = timesheet;
    next();
  });
});

app.put(
  "/api/employees/:employeeId/timesheets/:timesheetId",
  (req, res, next) => {
    const { hours, rate, date } = req.body.timesheet;
    if (!hours || !rate || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const sql = `UPDATE Timesheet SET hours =?, rate =?, date =? WHERE id =?`;
    db.run(sql, [hours, rate, date, req.timesheet.id], (err) => {
      if (err) {
        return next(err);
      }
      db.get(
        `SELECT * FROM Timesheet WHERE id =?`,
        [req.timesheet.id],
        (err, timesheet) => {
          if (err) {
            return next(err);
          }
          res.status(200).json({ timesheet: timesheet });
        }
      );
    });
  }
);

app.delete(
  "/api/employees/:employeeId/timesheets/:timesheetId",
  (req, res, next) => {
    const sql = `DELETE FROM Timesheet WHERE id =?`;
    db.run(sql, [req.timesheet.id], (err) => {
      if (err) {
        return next(err);
      }
      res.status(204).end();
    });
  }
);

app.get("/api/menus", (req, res, next) => {
  const sql = `SELECT * FROM Menu`;
  db.all(sql, (err, rows) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ menus: rows });
  });
});

app.post("/api/menus", (req, res, next) => {
  const { title } = req.body.menu;
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  // console.log(title);
  const sql = `INSERT INTO Menu (title) VALUES (?);`;
  db.run(sql, [title], function (err) {
    if (err) {
      return next(err);
    }

    // console.log(`A menu has been inserted with rowid ${this.lastID}`);

    db.get(
      `SELECT * FROM Menu WHERE Menu.id = ?`,
      [this.lastID],
      (err, menu) => {
        if (err) {
          return next(err);
        }
        res.status(201).json({ menu: menu });
      }
    );
  });
});

app.param("menuId", (req, res, next, id) => {
  const sql = `SELECT * FROM Menu WHERE Menu.id =?`;
  db.get(sql, [id], (err, menu) => {
    if (err) {
      return next(err);
    }
    if (!menu) {
      return res.status(404).json({ error: "menu not found" });
    }
    req.menu = menu;
    next();
  });
});

app.get("/api/menus/:menuId", (req, res) => {
  res.status(200).json({ menu: req.menu });
});

app.put("/api/menus/:menuId", (req, res, next) => {
  const { title } = req.body.menu;
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  const sql = `UPDATE Menu SET title =? WHERE Menu.id =?`;
  db.run(sql, [title, req.menu.id], (err) => {
    if (err) {
      return next(err);
    }
    db.get(
      `SELECT * FROM Menu WHERE Menu.id =?`,
      [req.menu.id],
      (err, menu) => {
        if (err) {
          return next(err);
        }
        res.status(200).json({ menu: menu });
      }
    );
  });
});

app.delete("/api/menus/:menuId", (req, res, next) => {
  const menuItemSql = `SELECT * FROM MenuItem WHERE MenuItem.menu_id =?`;
  db.get(menuItemSql, [req.menu.id], (err, menuItem) => {
    if (err) {
      return next(err);
    }
    if (menuItem) {
      return res.status(400).json({ error: "menu has menu items" });
    } else {
      const sql = `DELETE FROM Menu WHERE Menu.id =?`;
      db.run(sql, [req.menu.id], (err) => {
        if (err) {
          return next(err);
        }
        res.status(204).json({ message: "menu deleted" });
      });
    }
  });
});

app.get("/api/menus/:menuId/menu-items", (req, res, next) => {
  const sql = `SELECT * FROM MenuItem WHERE MenuItem.menu_id =?`;
  db.all(sql, [req.menu.id], (err, menuItems) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ menuItems: menuItems });
  });
});

app.post("/api/menus/:menuId/menu-items", (req, res, next) => {
  const { name, description, inventory, price } = req.body.menuItem;

  if (!name || !inventory || !price) {
    return res.status(400).json({ error: "missing required fields" });
  }
  // console.log([name, description, inventory, price, req.menu.id]);
  const sql = `INSERT INTO MenuItem (name, description, inventory, price, menu_id) VALUES (?,?,?,?,?)`;
  db.run(
    sql,
    [name, description, inventory, price, req.menu.id],
    function (err) {
      if (err) {
        return next(err);
      }

      console.log(`A menu has been inserted with rowid ${this.lastID}`);

      db.get(
        `SELECT * FROM MenuItem WHERE MenuItem.id = ?`,
        [this.lastID],
        (err, menuItem) => {
          if (err) {
            return next(err);
          }
          res.status(201).json({ menuItem: menuItem });
        }
      );
    }
  );
});

app.param("menuItemId", (req, res, next, id) => {
  db.get(
    `SELECT * FROM MenuItem WHERE MenuItem.id =?`,
    [id],
    (err, menuItem) => {
      if (err) {
        return next(err);
      }
      if (!menuItem) {
        return res.status(404).json({ error: "menuItem not found" });
      }
      req.menuItem = menuItem;
      next();
    }
  );
});

app.put("/api/menus/:menuId/menu-items/:menuItemId", (req, res, next) => {
  const { name, description, inventory, price } = req.body.menuItem;
  if (!name || !inventory || !price) {
    return res.status(400).json({ error: "missing required fields" });
  }
  const sql = `UPDATE MenuItem SET name =?, description =?, inventory =?, price =? WHERE id =?`;
  db.run(sql, [name, description, inventory, price, req.menuItem.id], (err) => {
    if (err) {
      return next(err);
    }
    console.log(`A menu item has been updated with rowid ${this.lastID}`);
    db.get(
      `SELECT * FROM MenuItem WHERE MenuItem.id =?`,
      [req.menuItem.id],
      (err, menuItem) => {
        if (err) {
          return next(err);
        }
        res.status(200).json({ menuItem: menuItem });
      }
    );
  });
});

app.delete("/api/menus/:menuId/menu-items/:menuItemId", (req, res, next) => {
  const sql = `DELETE FROM MenuItem WHERE id =?`;
  db.run(sql, [req.menuItem.id], (err) => {
    if (err) {
      return next(err);
    }
    console.log(`A menu item has been deleted with rowid ${this.lastID}`);
    res.status(204).json({ message: "menu item deleted" });
  });
});

app.listen(PORT, () => {
  console.log("Listening on port: " + PORT);
});

module.exports = app;
