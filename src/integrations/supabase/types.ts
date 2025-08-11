export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      apptexts: {
        Row: {
          customtext: string | null
          defaulttext: string | null
          key: string
          page: string
        }
        Insert: {
          customtext?: string | null
          defaulttext?: string | null
          key: string
          page: string
        }
        Update: {
          customtext?: string | null
          defaulttext?: string | null
          key?: string
          page?: string
        }
        Relationships: []
      }
      batchrun: {
        Row: {
          appversion: string | null
          clubparticipation: number | null
          comment: string | null
          endtime: string | null
          id: string
          initiatedby: string | null
          numberoferrors: number | null
          numberofrequests: number | null
          numberofrowsafter: number | null
          numberofrowsbefore: number | null
          renderjobid: string | null
          starttime: string | null
          status: string | null
        }
        Insert: {
          appversion?: string | null
          clubparticipation?: number | null
          comment?: string | null
          endtime?: string | null
          id?: string
          initiatedby?: string | null
          numberoferrors?: number | null
          numberofrequests?: number | null
          numberofrowsafter?: number | null
          numberofrowsbefore?: number | null
          renderjobid?: string | null
          starttime?: string | null
          status?: string | null
        }
        Update: {
          appversion?: string | null
          clubparticipation?: number | null
          comment?: string | null
          endtime?: string | null
          id?: string
          initiatedby?: string | null
          numberoferrors?: number | null
          numberofrequests?: number | null
          numberofrowsafter?: number | null
          numberofrowsbefore?: number | null
          renderjobid?: string | null
          starttime?: string | null
          status?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          apikey: string | null
          clubname: string | null
          organisationid: number
        }
        Insert: {
          apikey?: string | null
          clubname?: string | null
          organisationid: number
        }
        Update: {
          apikey?: string | null
          clubname?: string | null
          organisationid?: number
        }
        Relationships: []
      }
      eventorclubs: {
        Row: {
          clubname: string
          organisationid: number
        }
        Insert: {
          clubname: string
          organisationid: number
        }
        Update: {
          clubname?: string
          organisationid?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          batchid: string | null
          eventclassificationid: number | null
          eventdate: string | null
          eventdistance: string | null
          eventform: string | null
          eventid: number | null
          eventname: string | null
          eventorganiser: string | null
          eventorganiser_ids: string | null
          eventraceid: number
        }
        Insert: {
          batchid?: string | null
          eventclassificationid?: number | null
          eventdate?: string | null
          eventdistance?: string | null
          eventform?: string | null
          eventid?: number | null
          eventname?: string | null
          eventorganiser?: string | null
          eventorganiser_ids?: string | null
          eventraceid: number
        }
        Update: {
          batchid?: string | null
          eventclassificationid?: number | null
          eventdate?: string | null
          eventdistance?: string | null
          eventform?: string | null
          eventid?: number | null
          eventname?: string | null
          eventorganiser?: string | null
          eventorganiser_ids?: string | null
          eventraceid?: number
        }
        Relationships: []
      }
      logdata: {
        Row: {
          batchid: string | null
          comment: string | null
          completed: string | null
          errormessage: string | null
          eventid: number | null
          id: string
          level: string | null
          organisationid: number | null
          request: string | null
          responsecode: string | null
          source: string | null
          started: string | null
          timestamp: string | null
        }
        Insert: {
          batchid?: string | null
          comment?: string | null
          completed?: string | null
          errormessage?: string | null
          eventid?: number | null
          id?: string
          level?: string | null
          organisationid?: number | null
          request?: string | null
          responsecode?: string | null
          source?: string | null
          started?: string | null
          timestamp?: string | null
        }
        Update: {
          batchid?: string | null
          comment?: string | null
          completed?: string | null
          errormessage?: string | null
          eventid?: number | null
          id?: string
          level?: string | null
          organisationid?: number | null
          request?: string | null
          responsecode?: string | null
          source?: string | null
          started?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      persons: {
        Row: {
          batchid: string | null
          eventormodifydate: string | null
          organisationid: number
          personbirthdate: string | null
          personid: number
          personnamefamily: string | null
          personnamegiven: string | null
          personsex: string | null
        }
        Insert: {
          batchid?: string | null
          eventormodifydate?: string | null
          organisationid: number
          personbirthdate?: string | null
          personid: number
          personnamefamily?: string | null
          personnamegiven?: string | null
          personsex?: string | null
        }
        Update: {
          batchid?: string | null
          eventormodifydate?: string | null
          organisationid?: number
          personbirthdate?: string | null
          personid?: number
          personnamefamily?: string | null
          personnamegiven?: string | null
          personsex?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          batchid: string | null
          classresultnumberofstarts: number | null
          classtypeid: number | null
          clubparticipation: number | null
          eventclassname: string | null
          eventid: number | null
          eventraceid: number
          klassfaktor: number | null
          personage: number | null
          personid: number
          points: number | null
          relayleg: number | null
          relaylegoverallposition: number | null
          relayteamenddiff: number | null
          relayteamendposition: number | null
          relayteamendstatus: string | null
          relayteamname: string | null
          resultcompetitorstatus: string | null
          resultposition: number | null
          resulttime: number | null
          resulttimediff: number | null
        }
        Insert: {
          batchid?: string | null
          classresultnumberofstarts?: number | null
          classtypeid?: number | null
          clubparticipation?: number | null
          eventclassname?: string | null
          eventid?: number | null
          eventraceid: number
          klassfaktor?: number | null
          personage?: number | null
          personid: number
          points?: number | null
          relayleg?: number | null
          relaylegoverallposition?: number | null
          relayteamenddiff?: number | null
          relayteamendposition?: number | null
          relayteamendstatus?: string | null
          relayteamname?: string | null
          resultcompetitorstatus?: string | null
          resultposition?: number | null
          resulttime?: number | null
          resulttimediff?: number | null
        }
        Update: {
          batchid?: string | null
          classresultnumberofstarts?: number | null
          classtypeid?: number | null
          clubparticipation?: number | null
          eventclassname?: string | null
          eventid?: number | null
          eventraceid?: number
          klassfaktor?: number | null
          personage?: number | null
          personid?: number
          points?: number | null
          relayleg?: number | null
          relaylegoverallposition?: number | null
          relayteamenddiff?: number | null
          relayteamendposition?: number | null
          relayteamendstatus?: string | null
          relayteamname?: string | null
          resultcompetitorstatus?: string | null
          resultposition?: number | null
          resulttime?: number | null
          resulttimediff?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_results_batchrun"
            columns: ["batchid"]
            isOneToOne: false
            referencedRelation: "batchrun"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_results_event_race"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_eventrace"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_org"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
          {
            foreignKeyName: "fk_results_organisation"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
        ]
      }
      warnings: {
        Row: {
          batchid: string | null
          clubparticipation: number | null
          created: string | null
          eventid: number | null
          eventraceid: number | null
          id: string
          message: string | null
          organisationid: number | null
          personid: number | null
        }
        Insert: {
          batchid?: string | null
          clubparticipation?: number | null
          created?: string | null
          eventid?: number | null
          eventraceid?: number | null
          id?: string
          message?: string | null
          organisationid?: number | null
          personid?: number | null
        }
        Update: {
          batchid?: string | null
          clubparticipation?: number | null
          created?: string | null
          eventid?: number | null
          eventraceid?: number | null
          id?: string
          message?: string | null
          organisationid?: number | null
          personid?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
