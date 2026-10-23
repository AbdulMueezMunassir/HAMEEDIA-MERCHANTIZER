<?php
require_once 'db.php';
header("Content-Type: application/json");

$action = $_GET['action'] ?? '';
$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

try {
    // 1. ROLE-BASED LOGIN AUTHENTICATION
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $username = trim($input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        $stmt = $pdo->prepare("SELECT id, username, role, created_at FROM app_users WHERE LOWER(username) = LOWER(:u) AND password = :p");
        $stmt->execute([':u' => $username, ':p' => $password]);
        $user = $stmt->fetch();

        if ($user) {
            echo json_encode(["status" => "success", "user" => $user, "message" => "Welcome back, {$user['username']} ({$user['role']})!"]);
        } else {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
        }
        exit;
    }

    // 2. DESIGNER SUBMITS REQUEST + 10+ SAMPLES -> NOTIFIES HOD
    if ($action === 'submit_request' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $pdo->beginTransaction();

        $fabric_id        = intval($_POST['fabric_id']);
        $article_id       = !empty($_POST['article_id']) ? intval($_POST['article_id']) : null;
        $article_code     = $_POST['article_code'] ?? 'General';
        $designer_name    = $_POST['designer_name'] ?? 'Designer';
        $consumption      = floatval($_POST['consumption']);
        $estimate_qty     = intval($_POST['estimate_qty']);
        $total_requested  = round($consumption * $estimate_qty, 2);
        $designer_remarks = $_POST['designer_remarks'] ?? '';
        $season_used      = $_POST['season_used'] ?? 'December Christmas';

        $samplePaths = [];
        if (isset($_FILES['samples'])) {
            $files = $_FILES['samples'];
            $count = is_array($files['name']) ? count($files['name']) : 0;
            for ($i = 0; $i < $count; $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $safeName = uniqid('sample_') . '_' . preg_replace("/[^a-zA-Z0-9._-]/", "_", basename($files['name'][$i]));
                    if (move_uploaded_file($files['tmp_name'][$i], $uploadDir . $safeName)) {
                        $samplePaths[] = 'uploads/' . $safeName;
                    }
                }
            }
        }

        $s1 = $samplePaths[0] ?? null;
        $s2 = $samplePaths[1] ?? null;
        $s3 = $samplePaths[2] ?? null;
        $samplesJson = json_encode($samplePaths);

        $stmt = $pdo->prepare("
            INSERT INTO fabric_requests (
                fabric_id, article_id, article_code, designer_name,
                consumption, estimate_qty, total_requested,
                sample1, sample2, sample3, samples_json, designer_remarks, status, season_used
            ) VALUES (
                :fid, :aid, :acode, :dname,
                :cons, :eqty, :treq,
                :s1, :s2, :s3, :sjson, :drem, 'Pending', :season
            ) RETURNING id
        ");
        $stmt->execute([
            ':fid'    => $fabric_id,
            ':aid'    => $article_id,
            ':acode'  => $article_code,
            ':dname'  => $designer_name,
            ':cons'   => $consumption,
            ':eqty'   => $estimate_qty,
            ':treq'   => $total_requested,
            ':s1'     => $s1,
            ':s2'     => $s2,
            ':s3'     => $s3,
            ':sjson'  => $samplesJson,
            ':drem'   => $designer_remarks,
            ':season' => $season_used
        ]);

        // Notify HOD in real-time
        $notif = $pdo->prepare("
            INSERT INTO notifications (target_role, message, related_fabric_id)
            VALUES ('HOD', :msg, :fid)
        ");
        $notif->execute([
            ':msg' => "🎨 Designer ($designer_name) submitted Request for Fabric #$fabric_id ($article_code): {$consumption}m × {$estimate_qty} pcs = {$total_requested}m. Awaiting HOD Approval.",
            ':fid' => $fabric_id
        ]);

        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Request & " . count($samplePaths) . " samples submitted to HOD!"]);
        exit;
    }

    // 3. GET ALL REQUESTS (WITH DECODED FABRIC & SAMPLE IMAGE ARRAYS)
    if ($action === 'get_requests') {
        $stmt = $pdo->query("
            SELECT r.*,
                   f.supplier, f.supplier_no, f.article_no AS main_article_no,
                   f.fabric_category, f.wear_type, f.gsm, f.color_code, f.contain,
                   f.design_weave, f.fabric_designer, f.item_family, f.concept_code, f.width,
                   f.image1, f.image2, f.image3, f.images_json,
                   f.total_fabric, f.overall_balance, f.current_season, f.next_season_target
            FROM fabric_requests r
            JOIN fabrics f ON r.fabric_id = f.id
            ORDER BY r.id DESC
        ");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $sList = !empty($r['samples_json']) ? json_decode($r['samples_json'], true) : [];
            if (!is_array($sList) || count($sList) === 0) {
                $sList = array_values(array_filter([$r['sample1'], $r['sample2'], $r['sample3']]));
            }
            $r['samples_list'] = $sList;

            $fList = !empty($r['images_json']) ? json_decode($r['images_json'], true) : [];
            if (!is_array($fList) || count($fList) === 0) {
                $fList = array_values(array_filter([$r['image1'], $r['image2'], $r['image3']]));
            }
            $r['fabric_images_list'] = $fList;
        }
        echo json_encode(["status" => "success", "data" => $rows]);
        exit;
    }

    // 4. HOD ACCEPT / REJECT DECISION
    if ($action === 'hod_decision' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $request_id  = intval($input['request_id']);
        $decision    = $input['decision']; // 'Accepted' or 'Rejected'
        $hod_remarks = $input['hod_remarks'] ?? '';

        $pdo->beginTransaction();

        $reqStmt = $pdo->prepare("SELECT * FROM fabric_requests WHERE id = :id");
        $reqStmt->execute([':id' => $request_id]);
        $req = $reqStmt->fetch();
        if (!$req) throw new Exception("Request not found.");

        $updStmt = $pdo->prepare("
            UPDATE fabric_requests
            SET status = :status, hod_remarks = :hrem, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $updStmt->execute([':status' => $decision, ':hrem' => $hod_remarks, ':id' => $request_id]);

        if ($decision === 'Accepted') {
            if (!empty($req['article_id'])) {
                $artUpd = $pdo->prepare("
                    UPDATE fabric_articles
                    SET used_qty = used_qty + :req_qty,
                        balance_qty = GREATEST(0, allocated_qty - (used_qty + :req_qty))
                    WHERE id = :aid
                ");
                $artUpd->execute([':req_qty' => $req['total_requested'], ':aid' => $req['article_id']]);
            }

            $balUpd = $pdo->prepare("
                UPDATE fabrics
                SET overall_balance = GREATEST(0, overall_balance - :req_qty)
                WHERE id = :fid
            ");
            $balUpd->execute([':req_qty' => $req['total_requested'], ':fid' => $req['fabric_id']]);

            // Requirement: If HOD clicks Accept -> notify fabric uploading USER
            $notif = $pdo->prepare("
                INSERT INTO notifications (target_role, message, related_fabric_id)
                VALUES ('User', :msg, :fid)
            ");
            $notif->execute([
                ':msg' => "✅ HOD ACCEPTED Request #$request_id for Fabric #{$req['fabric_id']} ({$req['article_code']}) — {$req['total_requested']}m approved! HOD Remarks: $hod_remarks",
                ':fid' => $req['fabric_id']
            ]);
        } else {
            // Requirement: If HOD clicks Reject -> notify requesting DESIGNER
            $notif = $pdo->prepare("
                INSERT INTO notifications (target_role, message, related_fabric_id)
                VALUES ('Designer', :msg, :fid)
            ");
            $notif->execute([
                ':msg' => "❌ HOD REJECTED Request #$request_id for Fabric #{$req['fabric_id']} ({$req['article_code']}). HOD Remarks: $hod_remarks",
                ':fid' => $req['fabric_id']
            ]);
        }

        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Request $decision & Real-Time Notification sent!"]);
        exit;
    }

    // 5. REAL-TIME NOTIFICATIONS API
    if ($action === 'get_notifications') {
        $role = $_GET['role'] ?? 'User';
        if ($role === 'Super Admin' || $role === 'HOD') {
            $stmt = $pdo->query("SELECT * FROM notifications ORDER BY id DESC LIMIT 35");
        } else {
            $stmt = $pdo->prepare("SELECT * FROM notifications WHERE target_role = :role OR target_role = 'All' ORDER BY id DESC LIMIT 35");
            $stmt->execute([':role' => $role]);
        }
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'mark_notifications_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $role = $input['role'] ?? '';
        if ($role === 'Super Admin' || $role === 'HOD') {
            $pdo->query("UPDATE notifications SET is_read = TRUE");
        } else {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE target_role = :role");
            $stmt->execute([':role' => $role]);
        }
        echo json_encode(["status" => "success"]);
        exit;
    }

    // 6. SUPER ADMIN: MANAGE USERS & PASSWORDS
    if ($action === 'get_users') {
        $stmt = $pdo->query("SELECT id, username, password, role, created_at FROM app_users ORDER BY id ASC");
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'create_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $uname = trim($input['username'] ?? '');
        $pass  = trim($input['password'] ?? '');
        $role  = trim($input['role'] ?? 'User');

        if (!$uname || !$pass) {
            throw new Exception("Username and Password are required.");
        }

        $stmt = $pdo->prepare("INSERT INTO app_users (username, password, role) VALUES (:u, :p, :r)");
        $stmt->execute([':u' => $uname, ':p' => $pass, ':r' => $role]);
        echo json_encode(["status" => "success", "message" => "User '$uname' ($role) created successfully!"]);
        exit;
    }

    if ($action === 'delete_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $uid = intval($input['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM app_users WHERE id = :id AND username != 'admin'");
        $stmt->execute([':id' => $uid]);
        echo json_encode(["status" => "success", "message" => "User removed."]);
        exit;
    }

    // 7. SEASONAL BALANCE SIMULATION (250m -> 50m per Article - 10m used = 40m -> 200m for Ramadhan March)
    if ($action === 'simulate_christmas_ramadan' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents("php://input"), true);
        $fabric_id = intval($input['fabric_id']);
        $used_per_art = floatval($input['used_per_article'] ?? 10);

        $pdo->beginTransaction();
        $artStmt = $pdo->prepare("
            UPDATE fabric_articles
            SET used_qty = :used,
                balance_qty = GREATEST(0, allocated_qty - :used)
            WHERE fabric_id = :fid
        ");
        $artStmt->execute([':used' => $used_per_art, ':fid' => $fabric_id]);

        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(balance_qty), 0) FROM fabric_articles WHERE fabric_id = :fid");
        $sumStmt->execute([':fid' => $fabric_id]);
        $overallBalance = $sumStmt->fetchColumn();

        $fabUpd = $pdo->prepare("UPDATE fabrics SET overall_balance = :bal WHERE id = :fid");
        $fabUpd->execute([':bal' => $overallBalance, ':fid' => $fabric_id]);

        $pdo->commit();
        echo json_encode([
            "status" => "success",
            "message" => "Seasonal Balance Updated! Overall Carry-Forward Balance for Ramadhan March: {$overallBalance}m"
        ]);
        exit;
    }

    echo json_encode(["status" => "error", "message" => "Unknown API action"]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>