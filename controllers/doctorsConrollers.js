import express from 'express';
import db from '../config/db.js';

export const getAllDoctors = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM doctors ORDER BY id ASC')
        return res.status(200).json({
            status: "success",
            results: result.rows.length,
            data: result.rows
        })
    } catch (error) {
        console.error(' Error in getAllDoctors:', error);
        return res.status(500).json({ status: 'error', message: 'error in the server' });
    }
}
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // التأكد من أن id رقم صحيح
    if (isNaN(id)) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'Invalid ID format' 
      });
    }

    const result = await db.query('SELECT * FROM doctors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Doctor not found' 
      });
    }

    res.status(200).json({
      status: "success",
      data: { doctor: result.rows[0] }
    });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
};

export const getEducationByDoctorId = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await db.query('SELECT * FROM education WHERE doctor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Education not found' });
    }
    res.status(200).json({
      status: "success",
      data: {education: result.rows}
    })
  } catch (error) {
    console.error('Error fetching education:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
}
export const getCertificationsByDoctorId = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await db.query('SELECT * FROM certifications WHERE doctor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Certifications not found' });
    }
    res.status(200).json({
      status: "success",
      data: {certifications: result.rows}
    })
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
}
export const getAwardsByDoctorId = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await db.query('SELECT * FROM awards WHERE doctor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Awards not found' });
    }
    res.status(200).json({
      status: "success",
      data: {awards: result.rows}
    })
  } catch (error) {
    console.error('Error fetching awards:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
}
export const getMembershipsByDoctorId = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await db.query('SELECT * FROM memberships WHERE doctor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Memberships not found' });
    }
    res.status(200).json({
      status: "success",
      data: {memberships: result.rows}
    })
  } catch (error) {
    console.error('Error fetching memberships:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
}
export const getScheduleById = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await db.query('SELECT * FROM schedule WHERE doctor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Memberships not found' });
    }
    res.status(200).json({
      status: "success",
      data: {schedule: result.rows}
    })
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
}
